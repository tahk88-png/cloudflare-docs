import React, { useEffect, useMemo, useState } from "react";
import {
	format,
	formatDistanceToNowStrict,
	isValid,
	parseISO,
} from "date-fns";

type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; message: string };

type Rental = {
	id: string;
	reference?: string;
	status: string;
	startsAt?: Date;
	endsAt?: Date;
	lockerLocation?: string;
	lockerAddress?: string;
	detailsUrl?: string;
	rentAgainUrl?: string;
};

type Invoice = {
	id: string;
	number?: string;
	status: string;
	amount?: string;
	currency?: string;
	issuedAt?: Date;
	dueAt?: Date;
	pdfUrl?: string;
	payUrl?: string;
};

type Agreement = {
	id: string;
	title: string;
	signedAt?: Date;
	viewUrl?: string;
	downloadUrl?: string;
};

type DashboardVM = {
	activeRentals: Rental[];
	upcomingRentals: Rental[];
	pastRentals: Rental[];
	invoices: Invoice[];
	agreements: Agreement[];
};

const safeString = (v: unknown): string | undefined =>
	typeof v === "string" && v.trim() ? v : undefined;

const safeNumber = (v: unknown): number | undefined =>
	typeof v === "number" && Number.isFinite(v) ? v : undefined;

const safeDate = (v: unknown): Date | undefined => {
	if (v instanceof Date && isValid(v)) return v;
	if (typeof v === "string") {
		const d = parseISO(v);
		return isValid(d) ? d : undefined;
	}
	const n = safeNumber(v);
	if (typeof n === "number") {
		// Support unix seconds or ms.
		const d = new Date(n < 10_000_000_000 ? n * 1000 : n);
		return isValid(d) ? d : undefined;
	}
	return undefined;
};

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const asObj = (v: unknown): Record<string, unknown> | undefined =>
	v && typeof v === "object" && !Array.isArray(v)
		? (v as Record<string, unknown>)
		: undefined;

const pick = (
	obj: Record<string, unknown> | undefined,
	keys: string[],
): unknown => {
	if (!obj) return undefined;
	for (const k of keys) {
		if (obj[k] !== undefined) return obj[k];
	}
	return undefined;
};

async function fetchJson<T = unknown>(path: string): Promise<ApiResult<T>> {
	try {
		const res = await fetch(path, {
			method: "GET",
			credentials: "include",
			headers: {
				accept: "application/json",
			},
		});

		const ct = res.headers.get("content-type") ?? "";
		const isJson = ct.includes("application/json");

		if (!res.ok) {
			const message = isJson
				? JSON.stringify(await res.json()).slice(0, 600)
				: (await res.text()).slice(0, 600);
			return { ok: false, status: res.status, message };
		}

		if (!isJson) {
			return {
				ok: false,
				status: res.status,
				message: `Expected JSON but received: ${ct || "unknown content-type"}`,
			};
		}

		return { ok: true, data: (await res.json()) as T };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			message: err instanceof Error ? err.message : "Request failed",
		};
	}
}

function normalizeRental(raw: unknown): Rental | undefined {
	const o = asObj(raw);
	if (!o) return undefined;

	const id =
		safeString(pick(o, ["id", "bookingId", "rentalId", "uuid"])) ??
		safeString(pick(asObj(pick(o, ["booking", "rental"])), ["id", "uuid"]));

	if (!id) return undefined;

	const status =
		safeString(pick(o, ["status", "state"])) ??
		safeString(pick(asObj(pick(o, ["booking", "rental"])), ["status", "state"])) ??
		"unknown";

	const startsAt = safeDate(
		pick(o, ["startsAt", "startAt", "startTime", "start", "from"]),
	);
	const endsAt = safeDate(pick(o, ["endsAt", "endAt", "endTime", "end", "to"]));

	const locker = asObj(pick(o, ["locker", "box", "location"]));
	const lockerLocation =
		safeString(pick(locker, ["label", "name", "title"])) ??
		safeString(pick(o, ["lockerLocation", "lockerLabel", "locationLabel"]));
	const lockerAddress =
		safeString(pick(locker, ["address", "street"])) ??
		safeString(pick(o, ["lockerAddress", "address"]));

	const reference = safeString(pick(o, ["reference", "code", "bookingCode"]));

	const detailsUrl = safeString(
		pick(o, ["detailsUrl", "url", "href", "bookingUrl"]),
	);
	const rentAgainUrl = safeString(pick(o, ["rentAgainUrl", "repeatUrl"]));

	return {
		id,
		reference,
		status,
		startsAt,
		endsAt,
		lockerLocation,
		lockerAddress,
		detailsUrl,
		rentAgainUrl,
	};
}

function normalizeInvoice(raw: unknown): Invoice | undefined {
	const o = asObj(raw);
	if (!o) return undefined;

	const id = safeString(pick(o, ["id", "invoiceId", "uuid"]));
	if (!id) return undefined;

	const status = safeString(pick(o, ["status", "state"])) ?? "unknown";
	const number = safeString(pick(o, ["number", "invoiceNumber", "reference"]));

	const amount =
		safeString(pick(o, ["amount", "total", "totalAmount"])) ??
		(() => {
			const n = safeNumber(pick(o, ["amountCents", "totalCents"]));
			const c = safeString(pick(o, ["currency"]));
			if (typeof n !== "number") return undefined;
			const major = (n / 100).toFixed(2);
			return c ? `${major} ${c}` : major;
		})();

	const currency = safeString(pick(o, ["currency"]));

	const issuedAt = safeDate(pick(o, ["issuedAt", "createdAt", "date"]));
	const dueAt = safeDate(pick(o, ["dueAt", "dueDate"]));

	const pdfUrl = safeString(pick(o, ["pdfUrl", "downloadUrl", "pdf"]));
	const payUrl = safeString(pick(o, ["payUrl", "paymentUrl", "checkoutUrl"]));

	return {
		id,
		number,
		status,
		amount,
		currency,
		issuedAt,
		dueAt,
		pdfUrl,
		payUrl,
	};
}

function normalizeAgreement(raw: unknown): Agreement | undefined {
	const o = asObj(raw);
	if (!o) return undefined;

	const id = safeString(pick(o, ["id", "agreementId", "uuid"]));
	const title =
		safeString(pick(o, ["title", "name", "label"])) ??
		(safeString(pick(o, ["type"])) ? `${pick(o, ["type"])}` : undefined) ??
		"Agreement";

	if (!id) return undefined;

	const signedAt = safeDate(pick(o, ["signedAt", "signedOn", "createdAt"]));
	const viewUrl = safeString(pick(o, ["viewUrl", "url", "href"]));
	const downloadUrl = safeString(pick(o, ["downloadUrl", "pdfUrl", "fileUrl"]));

	return { id, title, signedAt, viewUrl, downloadUrl };
}

function categorizeRentals(
	rentals: Rental[],
	now: Date,
): Pick<DashboardVM, "activeRentals" | "upcomingRentals" | "pastRentals"> {
	const active: Rental[] = [];
	const upcoming: Rental[] = [];
	const past: Rental[] = [];

	const normStatus = (s: string) => s.toLowerCase().trim();

	for (const r of rentals) {
		const s = normStatus(r.status);
		const starts = r.startsAt;
		const ends = r.endsAt;

		const timeSaysActive =
			starts && ends ? starts <= now && ends > now : ends ? ends > now : false;
		const timeSaysPast = ends ? ends <= now : false;
		const timeSaysUpcoming = starts ? starts > now : false;

		const statusSaysPast =
			s.includes("complete") ||
			s.includes("ended") ||
			s.includes("expired") ||
			s.includes("cancel");

		const statusSaysActive =
			s === "active" ||
			s.includes("ongoing") ||
			s.includes("in_use") ||
			s.includes("in-use") ||
			s.includes("current");

		const statusSaysUpcoming =
			s.includes("upcoming") ||
			s.includes("reserved") ||
			s.includes("booked") ||
			s.includes("confirm");

		if (statusSaysPast || timeSaysPast) past.push(r);
		else if (statusSaysActive || timeSaysActive) active.push(r);
		else if (statusSaysUpcoming || timeSaysUpcoming) upcoming.push(r);
		else {
			// Fall back based on time, else treat as past to avoid “ghost active”.
			if (timeSaysUpcoming) upcoming.push(r);
			else if (timeSaysActive) active.push(r);
			else past.push(r);
		}
	}

	const bySoonestEnd = (a: Rental, b: Rental) =>
		(a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
		(b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
	const bySoonestStart = (a: Rental, b: Rental) =>
		(a.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
		(b.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
	const byLatestEnd = (a: Rental, b: Rental) =>
		(b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0);

	active.sort(bySoonestEnd);
	upcoming.sort(bySoonestStart);
	past.sort(byLatestEnd);

	return { activeRentals: active, upcomingRentals: upcoming, pastRentals: past };
}

function normalizeDashboard(
	dashboardRaw: unknown,
	bookingsRaw: unknown,
	invoicesRaw: unknown,
	now: Date,
): DashboardVM {
	const dashboard = asObj(dashboardRaw);
	const bookings = asObj(bookingsRaw);
	const invoices = asObj(invoicesRaw);

	const rentalsFromDashboard = [
		...asArray(pick(dashboard, ["activeRentals", "active", "currentRentals"])),
		...asArray(pick(dashboard, ["upcomingRentals", "upcoming", "nextRentals"])),
		...asArray(pick(dashboard, ["pastRentals", "past", "historyRentals"])),
	].map(normalizeRental).filter(Boolean) as Rental[];

	const rentalsFromBookings = asArray(pick(bookings, ["bookings", "rentals", "items"]))
		.map(normalizeRental)
		.filter(Boolean) as Rental[];

	const rentalById = new Map<string, Rental>();
	for (const r of [...rentalsFromDashboard, ...rentalsFromBookings]) {
		const prev = rentalById.get(r.id);
		rentalById.set(r.id, { ...prev, ...r });
	}
	const allRentals = Array.from(rentalById.values());
	const categorized = categorizeRentals(allRentals, now);

	const agreements = asArray(
		pick(dashboard, ["agreements", "signedAgreements", "documents"]),
	)
		.map(normalizeAgreement)
		.filter(Boolean) as Agreement[];

	const invoicesFromDashboard = asArray(pick(dashboard, ["invoices"]));
	const invoicesFromEndpoint = asArray(pick(invoices, ["invoices", "items"]));
	const invoiceById = new Map<string, Invoice>();
	for (const inv of [...invoicesFromDashboard, ...invoicesFromEndpoint]) {
		const n = normalizeInvoice(inv);
		if (!n) continue;
		const prev = invoiceById.get(n.id);
		invoiceById.set(n.id, { ...prev, ...n });
	}
	const allInvoices = Array.from(invoiceById.values()).sort((a, b) => {
		const da = (a.issuedAt ?? a.dueAt)?.getTime() ?? 0;
		const db = (b.issuedAt ?? b.dueAt)?.getTime() ?? 0;
		return db - da;
	});

	return {
		...categorized,
		invoices: allInvoices,
		agreements,
	};
}

function badgeTone(status: string): "success" | "caution" | "danger" | "note" {
	const s = status.toLowerCase();
	if (s.includes("paid") || s.includes("active") || s.includes("success")) {
		return "success";
	}
	if (s.includes("due") || s.includes("upcoming") || s.includes("pending")) {
		return "caution";
	}
	if (s.includes("overdue") || s.includes("failed") || s.includes("cancel")) {
		return "danger";
	}
	return "note";
}

function StatusBadge({ label }: { label: string }) {
	const tone = badgeTone(label);
	return (
		<span className={`rb-badge rb-badge--${tone}`} aria-label={`Status: ${label}`}>
			{label}
		</span>
	);
}

function formatWhen(d?: Date): string {
	if (!d) return "—";
	return format(d, "PPp");
}

function formatCountdown(target: Date, now: Date): string {
	const ms = target.getTime() - now.getTime();
	const prefix = ms >= 0 ? "in " : "";
	const suffix = ms < 0 ? " ago" : "";
	return `${prefix}${formatDistanceToNowStrict(target, { addSuffix: false })}${suffix}`;
}

async function rentAgain(booking: Rental): Promise<void> {
	const direct = booking.rentAgainUrl;
	if (direct) {
		window.location.assign(direct);
		return;
	}

	// Best-effort fallback: try a conventional “rent again” endpoint.
	try {
		const res = await fetch(`/api/me/bookings/${encodeURIComponent(booking.id)}/rent-again`, {
			method: "POST",
			credentials: "include",
			headers: { accept: "application/json" },
		});

		if (res.ok) {
			const ct = res.headers.get("content-type") ?? "";
			if (ct.includes("application/json")) {
				const body = (await res.json()) as unknown;
				const o = asObj(body);
				const url = safeString(pick(o, ["url", "redirectUrl", "checkoutUrl"]));
				if (url) {
					window.location.assign(url);
					return;
				}
			}

			const loc = res.headers.get("location");
			if (loc) {
				window.location.assign(loc);
				return;
			}
		}
	} catch {
		// ignore
	}

	// Last fallback: link-style repeat flow.
	window.location.assign(`/rent?fromBooking=${encodeURIComponent(booking.id)}`);
}

function Section({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rb-card mb-5">
			<header className="rb-card__header">
				<div>
					<h2 className="rb-card__title">{title}</h2>
					{subtitle ? <p className="rb-card__subtitle">{subtitle}</p> : null}
				</div>
			</header>
			<div className="rb-card__body">{children}</div>
		</section>
	);
}

function EmptyState({ text }: { text: string }) {
	return <p className="rb-muted text-sm">{text}</p>;
}

function RentalRow({
	rental,
	now,
	kind,
}: {
	rental: Rental;
	now: Date;
	kind: "active" | "upcoming" | "past";
}) {
	const primary =
		rental.lockerLocation ??
		(rental.reference ? `Booking ${rental.reference}` : `Booking ${rental.id}`);

	const secondaryParts = [
		rental.lockerAddress,
		rental.startsAt ? `Start: ${formatWhen(rental.startsAt)}` : undefined,
		rental.endsAt ? `End: ${formatWhen(rental.endsAt)}` : undefined,
	].filter(Boolean) as string[];

	const timing =
		kind === "active" && rental.endsAt
			? `Time left ${formatCountdown(rental.endsAt, now)}`
			: kind === "upcoming" && rental.startsAt
				? `Starts ${formatCountdown(rental.startsAt, now)}`
				: kind === "past" && rental.endsAt
					? `Ended ${formatCountdown(rental.endsAt, now)}`
					: undefined;

	return (
		<li className="rb-row">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<p className="truncate font-medium">{primary}</p>
					<StatusBadge label={rental.status} />
				</div>
				{secondaryParts.length ? (
					<p className="rb-muted mt-1 text-sm">{secondaryParts.join(" • ")}</p>
				) : null}
				{timing ? <p className="rb-muted mt-1 text-sm">{timing}</p> : null}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{rental.detailsUrl ? (
					<a className="rb-link" href={rental.detailsUrl}>
						View
					</a>
				) : null}
				<button className="rb-button" type="button" onClick={() => rentAgain(rental)}>
					Rent again
				</button>
			</div>
		</li>
	);
}

function InvoiceRow({ invoice, now }: { invoice: Invoice; now: Date }) {
	const label = invoice.number ? `Invoice ${invoice.number}` : `Invoice ${invoice.id}`;
	const due =
		invoice.dueAt && isValid(invoice.dueAt)
			? `Due ${formatCountdown(invoice.dueAt, now)}`
			: invoice.issuedAt
				? `Issued ${formatCountdown(invoice.issuedAt, now)}`
				: undefined;

	const amountText =
		invoice.amount ??
		(invoice.currency ? `— ${invoice.currency}` : "—");

	return (
		<li className="rb-row">
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<p className="truncate font-medium">{label}</p>
					<StatusBadge label={invoice.status} />
				</div>
				<p className="rb-muted mt-1 text-sm">
					{[amountText, due].filter(Boolean).join(" • ")}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{invoice.pdfUrl ? (
					<a className="rb-link" href={invoice.pdfUrl}>
						Download
					</a>
				) : null}
				{invoice.payUrl ? (
					<a className="rb-button rb-button--primary" href={invoice.payUrl}>
						Pay
					</a>
				) : null}
			</div>
		</li>
	);
}

function AgreementRow({ agreement }: { agreement: Agreement }) {
	const when = agreement.signedAt ? `Signed ${formatWhen(agreement.signedAt)}` : undefined;
	return (
		<li className="rb-row">
			<div className="min-w-0">
				<p className="truncate font-medium">{agreement.title}</p>
				{when ? <p className="rb-muted mt-1 text-sm">{when}</p> : null}
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{agreement.viewUrl ? (
					<a className="rb-link" href={agreement.viewUrl}>
						View
					</a>
				) : null}
				{agreement.downloadUrl ? (
					<a className="rb-button" href={agreement.downloadUrl}>
						Download
					</a>
				) : null}
			</div>
		</li>
	);
}

export default function UserDashboard() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [raw, setRaw] = useState<{
		dashboard: unknown;
		bookings: unknown;
		invoices: unknown;
	} | null>(null);

	// Update “time left” / countdowns without re-fetching.
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const t = window.setInterval(() => setNow(new Date()), 30_000);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);

			const [d, b, i] = await Promise.all([
				fetchJson("/api/me/dashboard"),
				fetchJson("/api/me/bookings"),
				fetchJson("/api/me/invoices"),
			]);

			if (cancelled) return;

			if (!d.ok && d.status === 401) {
				setError("Please log in to view your dashboard.");
				setRaw(null);
				setLoading(false);
				return;
			}

			if (!d.ok && !b.ok && !i.ok) {
				setError("We couldn’t load your dashboard. Please try again soon.");
				setRaw(null);
				setLoading(false);
				return;
			}

			// Only store raw in memory; never render raw directly.
			setRaw({
				dashboard: d.ok ? d.data : null,
				bookings: b.ok ? b.data : null,
				invoices: i.ok ? i.data : null,
			});

			// Surface partial failures without exposing sensitive payloads.
			if (!d.ok) {
				setError("Some data may be missing (dashboard summary unavailable).");
			} else if (!b.ok || !i.ok) {
				setError("Some data may be missing (bookings or invoices unavailable).");
			} else {
				setError(null);
			}

			setLoading(false);
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const vm: DashboardVM | null = useMemo(() => {
		if (!raw) return null;
		return normalizeDashboard(raw.dashboard, raw.bookings, raw.invoices, now);
	}, [raw, now]);

	const summary = useMemo(() => {
		if (!vm) return null;
		const unpaid = vm.invoices.filter((x) => {
			const s = x.status.toLowerCase();
			return s.includes("due") || s.includes("unpaid") || s.includes("overdue");
		}).length;
		return {
			active: vm.activeRentals.length,
			upcoming: vm.upcomingRentals.length,
			past: vm.pastRentals.length,
			unpaid,
		};
	}, [vm]);

	if (loading) {
		return (
			<div className="rb-grid">
				<div className="rb-skeleton h-20" />
				<div className="rb-skeleton h-40" />
				<div className="rb-skeleton h-40" />
			</div>
		);
	}

	if (!vm) {
		return (
			<div className="rb-grid">
				<Section title="Dashboard">
					<EmptyState text={error ?? "No data available."} />
					<div className="mt-4">
						<a className="rb-button rb-button--primary" href="/login">
							Log in
						</a>
					</div>
				</Section>
			</div>
		);
	}

	return (
		<div className="rb-grid">
			{summary ? (
				<section className="rb-card mb-5">
					<div className="rb-card__body">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div className="rb-metric">
								<p className="rb-metric__label">Active</p>
								<p className="rb-metric__value">{summary.active}</p>
							</div>
							<div className="rb-metric">
								<p className="rb-metric__label">Upcoming</p>
								<p className="rb-metric__value">{summary.upcoming}</p>
							</div>
							<div className="rb-metric">
								<p className="rb-metric__label">Past</p>
								<p className="rb-metric__value">{summary.past}</p>
							</div>
							<div className="rb-metric">
								<p className="rb-metric__label">Unpaid invoices</p>
								<p className="rb-metric__value">{summary.unpaid}</p>
							</div>
						</div>
						{error ? <p className="rb-muted mt-3 text-sm">{error}</p> : null}
					</div>
				</section>
			) : null}

			<Section
				title="Active rentals"
				subtitle="What you have right now (status, time left, locker location)."
			>
				{vm.activeRentals.length ? (
					<ul className="rb-list">
						{vm.activeRentals.map((r) => (
							<RentalRow key={r.id} rental={r} now={now} kind="active" />
						))}
					</ul>
				) : (
					<EmptyState text="No active rentals." />
				)}
			</Section>

			<Section title="Upcoming rentals" subtitle="What’s next (with a countdown).">
				{vm.upcomingRentals.length ? (
					<ul className="rb-list">
						{vm.upcomingRentals.map((r) => (
							<RentalRow key={r.id} rental={r} now={now} kind="upcoming" />
						))}
					</ul>
				) : (
					<EmptyState text="No upcoming rentals." />
				)}
			</Section>

			<Section title="Past rentals" subtitle="Your rental history.">
				{vm.pastRentals.length ? (
					<ul className="rb-list">
						{vm.pastRentals.slice(0, 10).map((r) => (
							<RentalRow key={r.id} rental={r} now={now} kind="past" />
						))}
					</ul>
				) : (
					<EmptyState text="No past rentals yet." />
				)}
			</Section>

			<Section title="Invoices & payments" subtitle="Invoices, payment status, and downloads.">
				{vm.invoices.length ? (
					<ul className="rb-list">
						{vm.invoices.slice(0, 10).map((inv) => (
							<InvoiceRow key={inv.id} invoice={inv} now={now} />
						))}
					</ul>
				) : (
					<EmptyState text="No invoices found." />
				)}
			</Section>

			<Section title="Signed agreements" subtitle="View or download your signed documents.">
				{vm.agreements.length ? (
					<ul className="rb-list">
						{vm.agreements.map((a) => (
							<AgreementRow key={a.id} agreement={a} />
						))}
					</ul>
				) : (
					<EmptyState text="No signed agreements found." />
				)}
			</Section>
		</div>
	);
}

