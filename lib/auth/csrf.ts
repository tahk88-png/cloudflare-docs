import "server-only";

import { headers } from "next/headers";

export async function assertSameOrigin() {
	const h = await headers();
	const origin = h.get("origin");
	const host = h.get("x-forwarded-host") ?? h.get("host");
	const proto = h.get("x-forwarded-proto") ?? "http";

	// Some non-browser contexts (tests, internal calls) may omit Origin.
	if (!origin || !host) return;

	const expected = `${proto}://${host}`;
	if (origin !== expected) {
		throw new Error("CSRF protection: origin mismatch.");
	}
}

