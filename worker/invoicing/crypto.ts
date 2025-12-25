export async function sha256Hex(data: ArrayBuffer | Uint8Array | string) {
	let bytes: Uint8Array;
	if (typeof data === "string") {
		bytes = new TextEncoder().encode(data);
	} else if (data instanceof ArrayBuffer) {
		bytes = new Uint8Array(data);
	} else {
		bytes = data;
	}
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return bufferToHex(digest);
}

export function bufferToHex(buf: ArrayBuffer) {
	const bytes = new Uint8Array(buf);
	let out = "";
	for (const b of bytes) out += b.toString(16).padStart(2, "0");
	return out;
}

export function randomTokenUrlSafe(bytes = 32) {
	const b = new Uint8Array(bytes);
	crypto.getRandomValues(b);
	// base64url without padding
	let s = btoa(String.fromCharCode(...b));
	s = s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
	return s;
}

