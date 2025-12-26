import type { APIRoute } from "astro";
import { sendReturnReminders } from "../../../scripts/send-return-reminder";
import { getRuntimeEnv } from "../../../util/runtime";

export const GET: APIRoute = async ({ locals }) => {
	// This endpoint should be protected and only accessible by Cloudflare Cron
	// In production, add authentication check here
	// Example: Check for Cloudflare Cron trigger header
	// const cronAuth = request.headers.get("X-Cron-Auth");
	// if (cronAuth !== process.env.CRON_SECRET) {
	//   return new Response("Unauthorized", { status: 401 });
	// }

	const env = getRuntimeEnv(locals);
	if (!env) {
		return new Response(
			JSON.stringify({ error: "Runtime environment not available" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const result = await sendReturnReminders(env);
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Error in return reminders cron:", error);
		return new Response(
			JSON.stringify({
				error: "Failed to send return reminders",
				details: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
