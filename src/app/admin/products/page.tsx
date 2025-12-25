import { prisma } from "@/lib/db/prisma";
import { listProducts } from "@/lib/admin/products";
import { ProductsClient } from "@/components/admin/products/ProductsClient";

export default async function AdminProductsPage({
	searchParams,
}: {
	searchParams?: { q?: string; page?: string };
}) {
	const q = searchParams?.q;
	const page = searchParams?.page ? Number(searchParams.page) : 1;

	const [categories, data] = await Promise.all([
		prisma.category.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
		listProducts({ q, page, pageSize: 20 }),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Products</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Create and maintain products, pricing, tags, and images.
				</p>
			</div>

			<ProductsClient
				data={data as any}
				categories={categories.map((c) => ({ id: c.id, name: c.name }))}
			/>
		</div>
	);
}

