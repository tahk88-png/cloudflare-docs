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

async function getCompartments(lockerId?: string) {
	const where: any = {};
	if (lockerId) {
		where.lockerId = lockerId;
	}

	return await prisma.compartment.findMany({
		where,
		include: {
			locker: true,
			product: true,
		},
		orderBy: [
			{ locker: { name: 'asc' } },
			{ label: 'asc' },
		],
	});
}

export default async function CompartmentsPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const lockerId = searchParams.lockerId as string | undefined;
	const compartments = await getCompartments(lockerId);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Compartments</h1>
					<p className="text-muted-foreground">Manage locker compartments</p>
				</div>
				<Button asChild>
					<Link href="/admin/compartments/new">
						<Plus className="mr-2 h-4 w-4" />
						New Compartment
					</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Locker</TableHead>
							<TableHead>Label</TableHead>
							<TableHead>Product</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Notes</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{compartments.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground">
									No compartments found
								</TableCell>
							</TableRow>
						) : (
							compartments.map((compartment) => (
								<TableRow key={compartment.id}>
									<TableCell className="font-medium">{compartment.locker.name}</TableCell>
									<TableCell>{compartment.label}</TableCell>
									<TableCell>{compartment.product?.name || '-'}</TableCell>
									<TableCell>
										<Badge variant={compartment.active ? 'default' : 'secondary'}>
											{compartment.active ? 'Active' : 'Maintenance'}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground max-w-xs truncate">
										{compartment.notes || '-'}
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
													<Link href={`/admin/compartments/${compartment.id}`}>
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
