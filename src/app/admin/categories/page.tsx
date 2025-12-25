import { listCategories } from "@/lib/admin/categories";
import { CategoriesClient } from "@/components/admin/categories/CategoriesClient";

export default async function AdminCategoriesPage() {
	// Server component, data loaded server-side.
	// RBAC enforced in /admin layout.
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Categories</h1>
				<p className="mt-1 text-sm text-[var(--rb-muted)]">
					Manage category order, slugs, icons, and active state.
				</p>
			</div>
			<CategoriesClient categories={await listCategories()} />
		</div>
	);
}

