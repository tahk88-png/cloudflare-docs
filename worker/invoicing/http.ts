export function json(
	body: unknown,
	init: ResponseInit & { headers?: Record<string, string> } = {},
) {
	const headers = new Headers(init.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return new Response(JSON.stringify(body), { ...init, headers });
}

export function problem(
	status: number,
	message: string,
	details?: Record<string, unknown>,
) {
	return json(
		{
			error: message,
			...(details ? { details } : {}),
		},
		{ status },
	);
}

export function getClientIp(request: Request): string | null {
	// Cloudflare standard headers
	return (
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		null
	);
}

export function getUserAgent(request: Request): string | null {
	return request.headers.get("user-agent");
}

export function nowIso() {
	return new Date().toISOString();
}

