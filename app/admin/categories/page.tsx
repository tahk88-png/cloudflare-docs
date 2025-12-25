import { prisma } from '@/lib/db';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, MoreHorizontal, Edit } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

async function getCategories() {
	return await prisma.category.findMany({
		orderBy: [
			{ order: 'asc' },
			{ name: 'asc' },
		],
	});
}

export default async function CategoriesPage() {
	const categories = await getCategories();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Categories</h1>
					<p className="text-muted-foreground">Manage product categories</p>
				</div>
				<Button asChild>
					<Link href="/admin/categories/new">
						<Plus className="mr-2 h-4 w-4" />
						New Category
					</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Order</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Icon</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{categories.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground">
									No categories found
								</TableCell>
							</TableRow>
						) : (
							categories.map((category) => (
								<TableRow key={category.id}>
									<TableCell>{category.order}</TableCell>
									<TableCell className="font-medium">{category.name}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{category.slug}</TableCell>
									<TableCell>{category.icon || '-'}</TableCell>
									<TableCell>
										<Badge variant={category.active ? 'default' : 'secondary'}>
											{category.active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem asChild>
													<Link href={`/admin/categories/${category.id}`}>
														<Edit className="mr-2 h-4 w-4" />
														Edit
													</Link>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
