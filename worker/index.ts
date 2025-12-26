import { WorkerEntrypoint } from "cloudflare:workers";
import { generateRedirectsEvaluator } from "redirects-in-workers";
import redirectsFileContents from "../dist/__redirects";

import { htmlToMarkdown } from "../src/util/markdown";
import type { DashboardData, Booking, Invoice } from "../src/types/dashboard";

const redirectsEvaluator = generateRedirectsEvaluator(redirectsFileContents, {
	maxLineLength: 10_000, // Usually 2_000
	maxStaticRules: 10_000, // Usually 2_000
	maxDynamicRules: 2_000, // Usually 100
});

export default class extends WorkerEntrypoint<Env> {
	// API route handlers for Rentbox.ee dashboard
	async handleApiRequest(request: Request): Promise<Response | null> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// Handle /api/me/* routes
		if (pathname.startsWith("/api/me/")) {
			// Get auth token from header (in production, validate this properly)
			const authHeader = request.headers.get("Authorization");
			if (!authHeader) {
				return new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Dashboard endpoint - aggregates all user data
			if (pathname === "/api/me/dashboard" && request.method === "GET") {
				return this.getDashboard(authHeader);
			}

			// Bookings endpoint
			if (pathname === "/api/me/bookings" && request.method === "GET") {
				return this.getBookings(authHeader);
			}

			// Invoices endpoint
			if (pathname === "/api/me/invoices" && request.method === "GET") {
				return this.getInvoices(authHeader);
			}
		}

		return null;
	}

	async getDashboard(authToken: string): Promise<Response> {
		// In production, fetch from your database/API
		// For now, return mock data
		const now = new Date();
		const dashboardData: DashboardData = {
			activeRentals: [
				{
					id: "rental-1",
					status: "active",
					startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
					lockerLocation: "Tallinn, Vabaduse väljak",
					lockerNumber: "A-12",
					itemName: "Electric Scooter",
					timeLeft: "5 days",
				},
			],
			upcomingRentals: [
				{
					id: "rental-2",
					status: "upcoming",
					startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
					endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
					lockerLocation: "Tallinn, Telliskivi",
					lockerNumber: "B-05",
					itemName: "Bicycle",
					countdown: 3 * 24 * 60 * 60 * 1000,
				},
			],
			pastRentals: [
				{
					id: "rental-3",
					status: "completed",
					startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
					endDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
					lockerLocation: "Tallinn, Old Town",
					lockerNumber: "C-22",
					itemName: "Camera Equipment",
				},
			],
			invoices: [
				{
					id: "inv-1",
					number: "INV-2024-001",
					date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					amount: 45.00,
					currency: "EUR",
					status: "paid",
					downloadUrl: "/api/me/invoices/inv-1/download",
					rentalId: "rental-1",
				},
			],
			agreements: [
				{
					id: "agr-1",
					type: "rental",
					signedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					downloadUrl: "/api/me/agreements/agr-1/download",
					rentalId: "rental-1",
				},
			],
		};

		return new Response(JSON.stringify(dashboardData), {
			headers: { "Content-Type": "application/json" },
		});
	}

	async getBookings(authToken: string): Promise<Response> {
		// In production, fetch from your database/API
		const bookings: Booking[] = [
			{
				id: "booking-1",
				rental: {
					id: "rental-1",
					status: "active",
					startDate: new Date().toISOString(),
					endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
					lockerLocation: "Tallinn, Vabaduse väljak",
					lockerNumber: "A-12",
					itemName: "Electric Scooter",
				},
			},
		];

		return new Response(JSON.stringify(bookings), {
			headers: { "Content-Type": "application/json" },
		});
	}

	async getInvoices(authToken: string): Promise<Response> {
		// In production, fetch from your database/API
		const invoices: Invoice[] = [
			{
				id: "inv-1",
				number: "INV-2024-001",
				date: new Date().toISOString(),
				amount: 45.00,
				currency: "EUR",
				status: "paid",
				downloadUrl: "/api/me/invoices/inv-1/download",
			},
		];

		return new Response(JSON.stringify(invoices), {
			headers: { "Content-Type": "application/json" },
		});
	}

	override async fetch(request: Request) {
		// Handle API routes first
		const apiResponse = await this.handleApiRequest(request);
		if (apiResponse) {
			return apiResponse;
		}
		if (request.url.endsWith("/markdown.zip")) {
			const res = await this.env.VENDORED_MARKDOWN.get("markdown.zip");

			return new Response(res?.body, {
				headers: {
					"Content-Type": "application/zip",
				},
			});
		}

		if (request.url.endsWith("/llms-full.txt")) {
			const { pathname } = new URL(request.url);
			const res = await this.env.VENDORED_MARKDOWN.get(pathname.slice(1));

			return new Response(res?.body, {
				headers: {
					"Content-Type": "text/markdown; charset=utf-8",
				},
			});
		}

		if (request.url.endsWith("/index.md")) {
			const htmlUrl = request.url.replace("index.md", "");
			const res = await this.env.ASSETS.fetch(htmlUrl, request);

			if (res.status === 404) {
				const redirect = await redirectsEvaluator(
					new Request(htmlUrl, request),
					this.env.ASSETS,
				);

				if (redirect) {
					const location = redirect.headers.get("location");

					return new Response(null, {
						status: redirect.status,
						headers: {
							Location: location + "index.md",
						},
					});
				}

				return res;
			}

			if (
				res.status === 200 &&
				res.headers.get("content-type")?.startsWith("text/html")
			) {
				const html = await res.text();

				const markdown = await htmlToMarkdown(html, request.url);

				if (!markdown) {
					return new Response("Not Found", { status: 404 });
				}

				return new Response(markdown, {
					headers: {
						"content-type": "text/markdown; charset=utf-8",
					},
				});
			}
		}

		try {
			try {
				const redirect = await redirectsEvaluator(request, this.env.ASSETS);
				if (redirect) {
					return redirect;
				}
			} catch (error) {
				console.error("Could not evaluate redirects", error);
			}

			try {
				const forceTrailingSlashURL = new URL(
					request.url.replace(/([^/])$/, "$1/"),
					request.url,
				);
				const redirect = await redirectsEvaluator(
					new Request(forceTrailingSlashURL, request),
					this.env.ASSETS,
				);
				if (redirect) {
					return redirect;
				}
			} catch (error) {
				console.error(
					"Could not evaluate redirects with a forced trailing slash",
					error,
				);
			}
		} catch (error) {
			console.error("Unknown error", error);
		}

		const response = await this.env.ASSETS.fetch(request);

		if (response.status === 404) {
			const section = new URL(response.url).pathname.split("/").at(1);

			if (!section) return response;

			const notFoundResponse = await this.env.ASSETS.fetch(
				`http://fakehost/${section}/404/`,
			);

			return new Response(notFoundResponse.body, {
				status: 404,
				headers: notFoundResponse.headers,
			});
		}

		return response;
	}
}
