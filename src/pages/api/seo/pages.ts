import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
	try {
		// Get all products/tools
		const products = await getCollection("products");
		
		// Generate pages for tools
		const toolPages = products.map((product) => ({
			type: "tool",
			slug: `/tools/${product.id}`,
			title: product.data.product?.title || product.id,
			description: product.data.product?.description || "",
			url: `https://developers.cloudflare.com/tools/${product.id}`,
		}));

		// Generate pages for locations (major cities/metros)
		const locations = [
			{ name: "New York", state: "NY", country: "USA" },
			{ name: "Los Angeles", state: "CA", country: "USA" },
			{ name: "Chicago", state: "IL", country: "USA" },
			{ name: "Houston", state: "TX", country: "USA" },
			{ name: "Phoenix", state: "AZ", country: "USA" },
			{ name: "Philadelphia", state: "PA", country: "USA" },
			{ name: "San Antonio", state: "TX", country: "USA" },
			{ name: "San Diego", state: "CA", country: "USA" },
			{ name: "Dallas", state: "TX", country: "USA" },
			{ name: "San Jose", state: "CA", country: "USA" },
			{ name: "London", country: "UK" },
			{ name: "Toronto", province: "ON", country: "Canada" },
			{ name: "Sydney", state: "NSW", country: "Australia" },
			{ name: "Tokyo", country: "Japan" },
			{ name: "Berlin", country: "Germany" },
		];

		const locationPages = locations.map((location) => ({
			type: "location",
			slug: `/locations/${location.name.toLowerCase().replace(/\s+/g, "-")}`,
			title: `${location.name}${location.state ? `, ${location.state}` : ""}`,
			description: `Cloudflare services and solutions in ${location.name}`,
			url: `https://developers.cloudflare.com/locations/${location.name.toLowerCase().replace(/\s+/g, "-")}`,
			location,
		}));

		// Generate pages for use-cases
		const useCases = [
			{ name: "Web Application Firewall", slug: "web-application-firewall" },
			{ name: "DDoS Protection", slug: "ddos-protection" },
			{ name: "Content Delivery Network", slug: "content-delivery-network" },
			{ name: "API Security", slug: "api-security" },
			{ name: "Bot Management", slug: "bot-management" },
			{ name: "SSL/TLS Encryption", slug: "ssl-tls-encryption" },
			{ name: "Load Balancing", slug: "load-balancing" },
			{ name: "Serverless Functions", slug: "serverless-functions" },
			{ name: "Edge Computing", slug: "edge-computing" },
			{ name: "Zero Trust Security", slug: "zero-trust-security" },
		];

		const useCasePages = useCases.map((useCase) => ({
			type: "use-case",
			slug: `/use-cases/${useCase.slug}`,
			title: useCase.name,
			description: `Learn how Cloudflare can help with ${useCase.name.toLowerCase()}`,
			url: `https://developers.cloudflare.com/use-cases/${useCase.slug}`,
		}));

		const allPages = [...toolPages, ...locationPages, ...useCasePages];

		return new Response(
			JSON.stringify({
				total: allPages.length,
				pages: allPages,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Failed to generate SEO pages",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
