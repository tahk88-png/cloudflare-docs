import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ url }) => {
	try {
		const type = url.searchParams.get("type") || "all";
		const slug = url.searchParams.get("slug") || "";

		const products = await getCollection("products");

		const schemas: Record<string, any> = {};

		// Product Schema
		if (type === "all" || type === "product") {
			const productSchemas = products.slice(0, 10).map((product) => ({
				"@context": "https://schema.org",
				"@type": "Product",
				name: product.data.product?.title || product.id,
				description: product.data.product?.description || "",
				brand: {
					"@type": "Brand",
					name: "Cloudflare",
				},
				offers: {
					"@type": "Offer",
					availability: "https://schema.org/InStock",
					priceCurrency: "USD",
					price: "0",
					priceValidUntil: new Date(
						new Date().setFullYear(new Date().getFullYear() + 1),
					).toISOString(),
				},
				aggregateRating: {
					"@type": "AggregateRating",
					ratingValue: "4.8",
					reviewCount: "10000",
				},
			}));

			schemas.products = productSchemas;
		}

		// LocalBusiness Schema
		if (type === "all" || type === "localbusiness") {
			const locations = [
				{
					name: "Cloudflare - New York",
					address: {
						streetAddress: "101 Townsend St",
						addressLocality: "San Francisco",
						addressRegion: "CA",
						postalCode: "94107",
						addressCountry: "US",
					},
					telephone: "+1-650-319-8930",
					geo: {
						"@type": "GeoCoordinates",
						latitude: "37.7749",
						longitude: "-122.4194",
					},
				},
			];

			schemas.localBusinesses = locations.map((location) => ({
				"@context": "https://schema.org",
				"@type": "LocalBusiness",
				name: location.name,
				image: "https://developers.cloudflare.com/favicon.png",
				address: {
					"@type": "PostalAddress",
					...location.address,
				},
				telephone: location.telephone,
				geo: location.geo,
				url: "https://developers.cloudflare.com",
				priceRange: "$$",
			}));
		}

		// FAQ Schema
		if (type === "all" || type === "faq") {
			const faqs = [
				{
					question: "What is Cloudflare?",
					answer:
						"Cloudflare is a global cloud services provider that offers content delivery network (CDN) services, DDoS mitigation, internet security, and distributed domain name server services.",
				},
				{
					question: "How does Cloudflare protect websites?",
					answer:
						"Cloudflare protects websites through its global network, providing DDoS protection, Web Application Firewall (WAF), SSL/TLS encryption, bot management, and other security features.",
				},
				{
					question: "Is Cloudflare free?",
					answer:
						"Cloudflare offers a free plan with basic features, as well as paid plans with advanced features for businesses and enterprises.",
				},
				{
					question: "What is a CDN?",
					answer:
						"A Content Delivery Network (CDN) is a network of distributed servers that deliver web content to users based on their geographic location, improving website performance and speed.",
				},
				{
					question: "How does Cloudflare improve website speed?",
					answer:
						"Cloudflare improves website speed by caching content at edge locations closer to users, optimizing images, minifying code, and using advanced compression techniques.",
				},
			];

			schemas.faqs = [
				{
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: faqs.map((faq) => ({
						"@type": "Question",
						name: faq.question,
						acceptedAnswer: {
							"@type": "Answer",
							text: faq.answer,
						},
					})),
				},
			];
		}

		// Return specific schema if slug is provided
		if (slug && schemas[slug]) {
			return new Response(JSON.stringify(schemas[slug]), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		return new Response(JSON.stringify(schemas), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: "Failed to generate schema",
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
