import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
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

async function getProducts(search?: string) {
	const where: any = {};

	if (search) {
		where.OR = [
			{ name: { contains: search, mode: 'insensitive' } },
			{ slug: { contains: search, mode: 'insensitive' } },
		];
	}

	const products = await prisma.product.findMany({
		where,
		include: {
			category: true,
			_count: {
				select: {
					compartments: true,
				},
			},
		},
		orderBy: {
			updatedAt: 'desc',
		},
		take: 100,
	});

	return products;
}

export default async function ProductsPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const search = searchParams.search as string | undefined;
	const products = await getProducts(search);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Products</h1>
					<p className="text-muted-foreground">Manage rental products</p>
				</div>
				<Button asChild>
					<Link href="/admin/products/new">
						<Plus className="mr-2 h-4 w-4" />
						New Product
					</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Category</TableHead>
							<TableHead>Price</TableHead>
							<TableHead>Unit</TableHead>
							<TableHead>Compartments</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Updated</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{products.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center text-muted-foreground">
									No products found
								</TableCell>
							</TableRow>
						) : (
							products.map((product) => (
								<TableRow key={product.id}>
									<TableCell className="font-medium">{product.name}</TableCell>
									<TableCell>{product.category?.name || '-'}</TableCell>
									<TableCell>{formatCurrency(product.basePrice)}</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										/{product.priceUnit}
									</TableCell>
									<TableCell>{product._count.compartments}</TableCell>
									<TableCell>
										<Badge variant={product.active ? 'default' : 'secondary'}>
											{product.active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{new Date(product.updatedAt).toLocaleDateString()}
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
													<Link href={`/admin/products/${product.id}`}>
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
