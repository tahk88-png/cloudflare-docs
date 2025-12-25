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

async function getLockers() {
	return await prisma.locker.findMany({
		include: {
			_count: {
				select: {
					compartments: true,
				},
			},
		},
		orderBy: {
			name: 'asc',
		},
	});
}

export default async function LockersPage() {
	const lockers = await getLockers();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Lockers</h1>
					<p className="text-muted-foreground">Manage locker locations</p>
				</div>
				<Button asChild>
					<Link href="/admin/lockers/new">
						<Plus className="mr-2 h-4 w-4" />
						New Locker
					</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>Timezone</TableHead>
							<TableHead>Compartments</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{lockers.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground">
									No lockers found
								</TableCell>
							</TableRow>
						) : (
							lockers.map((locker) => (
								<TableRow key={locker.id}>
									<TableCell className="font-medium">{locker.name}</TableCell>
									<TableCell>{locker.locationText}</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{locker.timezone}
									</TableCell>
									<TableCell>{locker._count.compartments}</TableCell>
									<TableCell>
										<Badge variant={locker.active ? 'default' : 'secondary'}>
											{locker.active ? 'Active' : 'Inactive'}
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
													<Link href={`/admin/lockers/${locker.id}`}>
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
