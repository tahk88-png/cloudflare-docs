import Link from "next/link";

export default function HomePage() {
	return (
		<main className="min-h-dvh bg-[var(--rb-bg)] p-6 text-[var(--rb-text)]">
			<div className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-card)] p-6">
				<h1 className="text-xl font-semibold">Rentbox Admin</h1>
				<p className="mt-2 text-sm text-[var(--rb-muted)]">
					Admin Panel is served by Next.js on port 3001.
				</p>
				<div className="mt-4">
					<Link
						href="/admin"
						className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--rb-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--rb-primary-hover)]"
					>
						Go to /admin
					</Link>
				</div>
			</div>
		</main>
	);
}

