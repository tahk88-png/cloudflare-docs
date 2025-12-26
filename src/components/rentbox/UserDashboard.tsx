import React, { useEffect, useMemo, useState } from "react";
import {
	format,
	formatDistanceToNowStrict,
	isAfter,
	isBefore,
	isValid,
	parseISO,
} from "date-fns";

type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; message: string };

type Money = {
	amount?: number;
	currency?: string;
};

type LockerLocation = {
	name?: string;
	address?: string;
	code?: string;
};

type Booking = {
	id?: string;
	status?: string;
	startsAt?: string;
	endsAt?: string;
	locker?: LockerLocation;
	lockerLocation?: LockerLocation;
	lockerName?: string;
	lockerCode?: string;
	location?: string;
	itemName?: string;
	productName?: string;
	rentAgainUrl?: string;
	repeatUrl?: string;
};

type Invoice = {
	id?: string;
	number?: string;
	status?: string;
	amount?: number;
	currency?: string;
	total?: Money;
	dueAt?: string;
	issuedAt?: string;
	pdfUrl?: string;
	downloadUrl?: string;
	payUrl?: string;
};

type Agreement = {
	id?: string;
	title?: string;
	signedAt?: string;
	viewUrl?: string;
	downloadUrl?: string;
};

type DashboardPayload = {
	agreements?: Agreement[];
	signedAgreements?: Agreement[];
	activeRentals?: Booking[];
	upcomingRentals?: Booking[];
	pastRentals?: Booking[];
};

function safeJson<T = unknown>(value: unknown): T | undefined {
	if (value && typeof value === "object") return value as T;
	return undefined;
}

async function fetchJson<T>(path: string): Promise<ApiResult<T>> {
	try {
		const res = await fetch(path, {
			method: "GET",
			headers: {
				accept: "application/json",
			},
			credentials: "include",
		});

		if (!res.ok) {
			// Never surface body text to avoid leaking details.
			return {
				ok: false,
				status: res.status,
				message:
					res.status === 401 || res.status === 403
						? "Please sign in to view your dashboard."
						: "We couldn’t load your dashboard right now.",
			};
		}

		const data = (await res.json()) as T;
		return { ok: true, data };
	} catch {
		return {
			ok: false,
			status: 0,
			message: "We couldn’t load your dashboard right now.",
		};
	}
}

function parseDate(value?: string): Date | undefined {
	if (!value) return undefined;
	const d = parseISO(value);
	return isValid(d) ? d : undefined;
}

function cn(...parts: Array<string | undefined | false>) {
	return parts.filter(Boolean).join(" ");
}

function badgeVariantFromStatus(statusRaw?: string): {
	label: string;
	variant: "success" | "note" | "tip" | "caution" | "danger" | "default";
} {
	const status = (statusRaw || "").toLowerCase();
	if (!status) return { label: "Unknown", variant: "default" };

	if (["active", "in_use", "ongoing", "running"].includes(status)) {
		return { label: "Active", variant: "success" };
	}
	if (["upcoming", "confirmed", "reserved", "scheduled"].includes(status)) {
		return { label: "Upcoming", variant: "note" };
	}
	if (["completed", "finished"].includes(status)) {
		return { label: "Completed", variant: "tip" };
	}
	if (["cancelled", "canceled", "refunded"].includes(status)) {
		return { label: "Cancelled", variant: "default" };
	}
	if (["expired", "overdue", "failed"].includes(status)) {
		return { label: "Action needed", variant: "danger" };
	}
	if (["payment_due", "unpaid", "due"].includes(status)) {
		return { label: "Payment due", variant: "caution" };
	}

	// Fall back to a title-cased label.
	return {
		label: status
			.split(/[_\s-]+/g)
			.filter(Boolean)
			.map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
			.join(" "),
		variant: "default",
	};
}

function formatWhen(value?: string): string | undefined {
	const d = parseDate(value);
	if (!d) return undefined;
	return format(d, "PP p");
}

function formatCountdownTo(value?: string): string | undefined {
	const d = parseDate(value);
	if (!d) return undefined;
	return formatDistanceToNowStrict(d, { addSuffix: true });
}

function formatMoney(m: Money | undefined): string | undefined {
	if (!m || typeof m.amount !== "number") return undefined;
	const currency = (m.currency || "EUR").toUpperCase();
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
		}).format(m.amount / 100);
	} catch {
		return `${(m.amount / 100).toFixed(2)} ${currency}`;
	}
}

function normalizeBookings(payload: unknown): Booking[] {
	if (Array.isArray(payload)) return payload.filter(Boolean) as Booking[];

	const obj = safeJson<Record<string, unknown>>(payload);
	const candidate =
		obj?.bookings ?? obj?.rentals ?? obj?.items ?? obj?.results ?? obj?.data;
	return Array.isArray(candidate) ? (candidate as Booking[]) : [];
}

function normalizeInvoices(payload: unknown): Invoice[] {
	if (Array.isArray(payload)) return payload.filter(Boolean) as Invoice[];

	const obj = safeJson<Record<string, unknown>>(payload);
	const candidate = obj?.invoices ?? obj?.results ?? obj?.data;
	return Array.isArray(candidate) ? (candidate as Invoice[]) : [];
}

function normalizeAgreements(payload: unknown): Agreement[] {
	if (Array.isArray(payload)) return payload.filter(Boolean) as Agreement[];
	const obj = safeJson<Record<string, unknown>>(payload);
	const candidate = obj?.agreements ?? obj?.signedAgreements ?? obj?.documents;
	return Array.isArray(candidate) ? (candidate as Agreement[]) : [];
}

function bookingLockerLabel(b: Booking): string | undefined {
	const locker = b.locker ?? b.lockerLocation;
	const parts = [
		locker?.name ?? b.lockerName,
		locker?.code ?? b.lockerCode,
		b.location,
		locker?.address,
	].filter(Boolean);
	return parts.length ? parts.join(" · ") : undefined;
}

function bookingTitle(b: Booking): string {
	return (
		b.itemName ||
		b.productName ||
		(b.id ? `Rental #${b.id}` : "Rental")
	);
}

function splitBookings(bookings: Booking[]) {
	const now = new Date();

	const active: Booking[] = [];
	const upcoming: Booking[] = [];
	const past: Booking[] = [];

	for (const b of bookings) {
		const start = parseDate(b.startsAt);
		const end = parseDate(b.endsAt);
		const status = (b.status || "").toLowerCase();

		const isExplicitActive = ["active", "in_use", "ongoing", "running"].includes(
			status,
		);
		const isExplicitUpcoming = ["upcoming", "confirmed", "reserved", "scheduled"].includes(
			status,
		);
		const isExplicitPast = ["completed", "finished", "cancelled", "canceled", "expired"].includes(
			status,
		);

		if (isExplicitActive) {
			active.push(b);
			continue;
		}

		if (isExplicitUpcoming) {
			upcoming.push(b);
			continue;
		}

		if (isExplicitPast) {
			past.push(b);
			continue;
		}

		// Date-based fallback.
		if (start && end && isBefore(start, now) && isAfter(end, now)) {
			active.push(b);
		} else if (start && isAfter(start, now)) {
			upcoming.push(b);
		} else if (end && isBefore(end, now)) {
			past.push(b);
		} else {
			// Unknown -> treat as upcoming if start exists, otherwise past.
			(start ? upcoming : past).push(b);
		}
	}

	active.sort((a, b) => (a.endsAt || "").localeCompare(b.endsAt || ""));
	upcoming.sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
	past.sort((a, b) => (b.endsAt || "").localeCompare(a.endsAt || ""));

	return { active, upcoming, past };
}

function SectionCard(props: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="m-0 text-base font-semibold">{props.title}</h2>
					{props.subtitle ? (
						<p className="m-0 mt-1 text-sm text-[var(--sl-color-text-accent)] opacity-80">
							{props.subtitle}
						</p>
					) : null}
				</div>
			</div>
			<div className="mt-4">{props.children}</div>
		</section>
	);
}

function StatusBadge(props: { status?: string; labelOverride?: string }) {
	const { label, variant } = badgeVariantFromStatus(props.status);
	return (
		<span className={cn("sl-badge", variant)}>{props.labelOverride ?? label}</span>
	);
}

function PrimaryButton(props: React.ComponentProps<"a"> & { disabled?: boolean }) {
	const { disabled, className, ...rest } = props;
	if (disabled) {
		return (
			<span
				className={cn(
					"inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold",
					"bg-[var(--sl-color-gray-6)] text-[var(--sl-color-gray-1)] opacity-60",
					className,
				)}
				aria-disabled="true"
			>
				{props.children}
			</span>
		);
	}
	return (
		<a
			{...rest}
			className={cn(
				"inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold no-underline",
				"bg-[var(--sl-color-accent)] text-white hover:opacity-90",
				className,
			)}
		/>
	);
}

function SecondaryLink(props: React.ComponentProps<"a">) {
	return (
		<a
			{...props}
			className={cn(
				"text-sm font-semibold text-[var(--sl-color-accent)] no-underline hover:underline",
				props.className,
			)}
		/>
	);
}

export default function UserDashboard() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<ApiResult<unknown> | null>(null);

	const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [invoices, setInvoices] = useState<Invoice[]>([]);

	// Tick every 30s for countdowns.
	const [, setNowTick] = useState(0);
	useEffect(() => {
		const t = window.setInterval(() => setNowTick((x) => x + 1), 30_000);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		(async () => {
			const [dashRes, bookingsRes, invoicesRes] = await Promise.all([
				fetchJson<unknown>("/api/me/dashboard"),
				fetchJson<unknown>("/api/me/bookings"),
				fetchJson<unknown>("/api/me/invoices"),
			]);

			if (cancelled) return;

			if (!dashRes.ok && (dashRes.status === 401 || dashRes.status === 403)) {
				setError(dashRes);
				setLoading(false);
				return;
			}
			if (!bookingsRes.ok && (bookingsRes.status === 401 || bookingsRes.status === 403)) {
				setError(bookingsRes);
				setLoading(false);
				return;
			}
			if (!invoicesRes.ok && (invoicesRes.status === 401 || invoicesRes.status === 403)) {
				setError(invoicesRes);
				setLoading(false);
				return;
			}

			// Soft-fail any individual endpoint (except auth), but still render what we can.
			if (dashRes.ok) {
				const d = safeJson<DashboardPayload>(dashRes.data) ?? null;
				setDashboard(d);
			}

			if (bookingsRes.ok) {
				setBookings(normalizeBookings(bookingsRes.data));
			}

			if (invoicesRes.ok) {
				setInvoices(normalizeInvoices(invoicesRes.data));
			}

			// If everything failed (non-auth), show a single generic error state.
			if (!dashRes.ok && !bookingsRes.ok && !invoicesRes.ok) {
				setError(dashRes);
			}

			setLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const derived = useMemo(() => {
		const fromDashActive = dashboard?.activeRentals ?? [];
		const fromDashUpcoming = dashboard?.upcomingRentals ?? [];
		const fromDashPast = dashboard?.pastRentals ?? [];

		const hasDashSlices =
			fromDashActive.length || fromDashUpcoming.length || fromDashPast.length;

		if (hasDashSlices) {
			return {
				active: fromDashActive,
				upcoming: fromDashUpcoming,
				past: fromDashPast,
			};
		}

		return splitBookings(bookings);
	}, [bookings, dashboard]);

	const agreements = useMemo(() => {
		const fromDash =
			dashboard?.signedAgreements ?? dashboard?.agreements ?? undefined;
		return normalizeAgreements(fromDash ?? []);
	}, [dashboard]);

	const nextUpcoming = derived.upcoming[0];
	const nextUpcomingStarts = nextUpcoming?.startsAt;

	const outstandingInvoices = useMemo(() => {
		const now = new Date();
		return invoices.filter((inv) => {
			const status = (inv.status || "").toLowerCase();
			if (["paid", "settled"].includes(status)) return false;
			const due = parseDate(inv.dueAt);
			// If no due date, still show as outstanding.
			if (!due) return true;
			return isAfter(due, now) || isBefore(due, now);
		});
	}, [invoices]);

	if (error && !error.ok) {
		const isAuth = error.status === 401 || error.status === 403;
		return (
			<div className="rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-4">
				<p className="m-0 text-sm">{error.message}</p>
				<div className="mt-3 flex flex-wrap gap-3">
					{isAuth ? (
						<PrimaryButton href="/login">Sign in</PrimaryButton>
					) : (
						<PrimaryButton href="/dashboard">Retry</PrimaryButton>
					)}
					<SecondaryLink href="/support">Contact support</SecondaryLink>
				</div>
			</div>
		);
	}

	return (
		<div className="not-content">
			<div className="rounded-2xl bg-[var(--sl-color-bg-nav)] p-4 md:p-6">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="m-0 text-xl font-semibold">Your dashboard</h1>
						<p className="m-0 mt-1 text-sm opacity-80">
							What you have, what’s next, and what’s done.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<span className={cn("sl-badge", "success")}>
							Active: {derived.active.length}
						</span>
						<span className={cn("sl-badge", "note")}>
							Upcoming: {derived.upcoming.length}
						</span>
						<span className={cn("sl-badge", "tip")}>
							Past: {derived.past.length}
						</span>
						<span className={cn("sl-badge", outstandingInvoices.length ? "caution" : "default")}>
							Invoices: {invoices.length}
						</span>
					</div>
				</div>

				{nextUpcomingStarts ? (
					<p className="m-0 mt-4 text-sm">
						<strong>Next rental:</strong>{" "}
						{formatCountdownTo(nextUpcomingStarts)}{" "}
						<span className="opacity-80">({formatWhen(nextUpcomingStarts)})</span>
					</p>
				) : null}
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SectionCard
					title="Active rentals"
					subtitle="Status, time left, and locker details."
				>
					{loading ? (
						<p className="m-0 text-sm opacity-70">Loading…</p>
					) : derived.active.length ? (
						<ul className="m-0 grid list-none gap-3 p-0">
							{derived.active.map((b) => {
								const timeLeft = b.endsAt ? formatCountdownTo(b.endsAt) : undefined;
								return (
									<li
										key={b.id ?? `${b.startsAt ?? ""}-${b.endsAt ?? ""}`}
										className="rounded-lg border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="m-0 truncate text-sm font-semibold">
													{bookingTitle(b)}
												</p>
												<p className="m-0 mt-1 text-sm opacity-80">
													{bookingLockerLabel(b) ?? "Locker location will appear here."}
												</p>
											</div>
											<div className="shrink-0 text-right">
												<StatusBadge status={b.status} />
												{timeLeft ? (
													<p className="m-0 mt-1 text-xs opacity-80">
														{timeLeft.replace("in ", "")} left
													</p>
												) : null}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="m-0 text-sm opacity-70">
							No active rentals right now.
						</p>
					)}
				</SectionCard>

				<SectionCard title="Upcoming rentals" subtitle="Countdown to your next rental.">
					{loading ? (
						<p className="m-0 text-sm opacity-70">Loading…</p>
					) : derived.upcoming.length ? (
						<ul className="m-0 grid list-none gap-3 p-0">
							{derived.upcoming.slice(0, 5).map((b) => (
								<li
									key={b.id ?? `${b.startsAt ?? ""}-${b.endsAt ?? ""}`}
									className="rounded-lg border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="m-0 truncate text-sm font-semibold">
												{bookingTitle(b)}
											</p>
											<p className="m-0 mt-1 text-sm opacity-80">
												Starts {formatCountdownTo(b.startsAt) ?? "soon"}
												{b.startsAt ? (
													<span className="opacity-80">
														{" "}
														({formatWhen(b.startsAt)})
													</span>
												) : null}
											</p>
										</div>
										<div className="shrink-0 text-right">
											<StatusBadge status={b.status} />
										</div>
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="m-0 text-sm opacity-70">
							Nothing scheduled. When you book again, it’ll show up here.
						</p>
					)}
				</SectionCard>
			</div>

			<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SectionCard
					title="Invoices & payments"
					subtitle="Download invoices and quickly see what’s due."
				>
					{loading ? (
						<p className="m-0 text-sm opacity-70">Loading…</p>
					) : invoices.length ? (
						<ul className="m-0 grid list-none gap-3 p-0">
							{invoices.slice(0, 6).map((inv) => {
								const money: Money =
									inv.total ?? {
										amount: inv.amount,
										currency: inv.currency,
									};
								const amount = formatMoney(money);
								const due = formatWhen(inv.dueAt);
								const status = (inv.status || "").toLowerCase();
								const variant =
									["paid", "settled"].includes(status)
										? "success"
										: ["overdue", "failed"].includes(status)
											? "danger"
											: ["due", "unpaid", "payment_due"].includes(status)
												? "caution"
												: "default";

								const download = inv.downloadUrl ?? inv.pdfUrl;
								const pay = inv.payUrl;

								return (
									<li
										key={inv.id ?? inv.number ?? JSON.stringify(inv)}
										className="rounded-lg border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="m-0 truncate text-sm font-semibold">
													Invoice {inv.number ?? inv.id ?? "—"}
												</p>
												<p className="m-0 mt-1 text-sm opacity-80">
													{amount ?? "Amount pending"}{" "}
													{due ? <span>· Due {due}</span> : null}
												</p>
											</div>
											<div className="shrink-0 text-right">
												<span className={cn("sl-badge", variant)}>
													{inv.status ? badgeVariantFromStatus(inv.status).label : "Invoice"}
												</span>
											</div>
										</div>
										<div className="mt-3 flex flex-wrap gap-2">
											{download ? (
												<SecondaryLink
													href={download}
													target="_blank"
													rel="noopener noreferrer"
												>
													Download
												</SecondaryLink>
											) : null}
											{pay ? (
												<PrimaryButton
													href={pay}
													target="_blank"
													rel="noopener noreferrer"
												>
													Pay now
												</PrimaryButton>
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="m-0 text-sm opacity-70">No invoices found.</p>
					)}
				</SectionCard>

				<SectionCard
					title="Signed agreements"
					subtitle="View or download your signed documents."
				>
					{loading ? (
						<p className="m-0 text-sm opacity-70">Loading…</p>
					) : agreements.length ? (
						<ul className="m-0 grid list-none gap-3 p-0">
							{agreements.slice(0, 6).map((doc) => (
								<li
									key={doc.id ?? doc.title ?? JSON.stringify(doc)}
									className="rounded-lg border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="m-0 truncate text-sm font-semibold">
												{doc.title ?? "Signed agreement"}
											</p>
											<p className="m-0 mt-1 text-sm opacity-80">
												{doc.signedAt ? `Signed ${formatWhen(doc.signedAt)}` : "Signed"}
											</p>
										</div>
										<span className={cn("sl-badge", "tip")}>Signed</span>
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										{doc.viewUrl ? (
											<SecondaryLink
												href={doc.viewUrl}
												target="_blank"
												rel="noopener noreferrer"
											>
												View
											</SecondaryLink>
										) : null}
										{doc.downloadUrl ? (
											<SecondaryLink
												href={doc.downloadUrl}
												target="_blank"
												rel="noopener noreferrer"
											>
												Download
											</SecondaryLink>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="m-0 text-sm opacity-70">
							No signed agreements yet. If you complete a rental, documents will
							appear here.
						</p>
					)}
				</SectionCard>
			</div>

			<div className="mt-4">
				<SectionCard title="Past rentals" subtitle="History and a one-click way to rent again.">
					{loading ? (
						<p className="m-0 text-sm opacity-70">Loading…</p>
					) : derived.past.length ? (
						<ul className="m-0 grid list-none gap-3 p-0">
							{derived.past.slice(0, 8).map((b) => {
								const repeat = b.rentAgainUrl ?? b.repeatUrl;
								return (
									<li
										key={b.id ?? `${b.startsAt ?? ""}-${b.endsAt ?? ""}`}
										className="rounded-lg border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="m-0 truncate text-sm font-semibold">
													{bookingTitle(b)}
												</p>
												<p className="m-0 mt-1 text-sm opacity-80">
													{b.endsAt ? `Ended ${formatWhen(b.endsAt)}` : "Past rental"}
													{bookingLockerLabel(b) ? (
														<span> · {bookingLockerLabel(b)}</span>
													) : null}
												</p>
											</div>
											<div className="shrink-0 text-right">
												<StatusBadge status={b.status} labelOverride="Past" />
											</div>
										</div>

										<div className="mt-3 flex flex-wrap gap-2">
											<PrimaryButton
												href={repeat ?? "#"}
												disabled={!repeat}
												aria-label="Rent again"
											>
												Rent again
											</PrimaryButton>
											{!repeat ? (
												<span className="text-xs opacity-70">
													(Available when repeat links are enabled.)
												</span>
											) : null}
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="m-0 text-sm opacity-70">
							No rental history yet.
						</p>
					)}
				</SectionCard>
			</div>

			{loading ? (
				<p className="m-0 mt-4 text-xs opacity-60">Refreshing timers…</p>
			) : null}
		</div>
	);
}

