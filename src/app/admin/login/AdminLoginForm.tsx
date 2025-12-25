"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function AdminLoginForm({ from }: { from: string }) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const res = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});
		setLoading(false);

		if (!res || res.error) {
			setError("Invalid credentials.");
			return;
		}

		window.location.href = from;
	}

	return (
		<main className="min-h-dvh bg-[var(--rb-bg)] p-6 text-[var(--rb-text)]">
			<div className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-card)] p-6">
				<h1 className="text-lg font-semibold">Admin sign-in</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Rentbox Admin access is restricted.
				</p>

				<form className="mt-6 space-y-3" onSubmit={onSubmit}>
					<label className="block text-sm">
						<span className="text-[var(--rb-muted)]">Email</span>
						<input
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							type="email"
							autoComplete="email"
							required
							className="mt-1 h-10 w-full rounded-lg border border-[var(--rb-border)] bg-white px-3 text-sm"
						/>
					</label>
					<label className="block text-sm">
						<span className="text-[var(--rb-muted)]">Password</span>
						<input
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							type="password"
							autoComplete="current-password"
							required
							className="mt-1 h-10 w-full rounded-lg border border-[var(--rb-border)] bg-white px-3 text-sm"
						/>
					</label>

					{error ? (
						<div className="rounded-lg border border-[var(--rb-border)] bg-white p-3 text-sm text-[var(--rb-error)]">
							{error}
						</div>
					) : null}

					<button
						type="submit"
						disabled={loading}
						className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--rb-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--rb-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? "Signing in…" : "Sign in"}
					</button>
				</form>
			</div>
		</main>
	);
}

