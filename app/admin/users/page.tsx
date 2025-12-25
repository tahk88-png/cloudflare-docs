import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/requireRole';
import { UserRole } from '@prisma/client';
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

async function getUsers() {
	return await prisma.user.findMany({
		orderBy: {
			createdAt: 'desc',
		},
	});
}

const roleColors: Record<UserRole, 'default' | 'secondary' | 'destructive' | 'success'> = {
	owner: 'destructive',
	admin: 'default',
	operator: 'secondary',
	viewer: 'secondary',
};

export default async function UsersPage() {
	await requireRole(['owner']);

	const users = await getUsers();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Users & Roles</h1>
					<p className="text-muted-foreground">Manage admin users and permissions</p>
				</div>
				<Button asChild>
					<Link href="/admin/users/new">
						<Plus className="mr-2 h-4 w-4" />
						New User
					</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Email</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground">
									No users found
								</TableCell>
							</TableRow>
						) : (
							users.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">{user.email}</TableCell>
									<TableCell>{user.name || '-'}</TableCell>
									<TableCell>
										<Badge variant={roleColors[user.role]}>{user.role}</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={user.active ? 'default' : 'secondary'}>
											{user.active ? 'Active' : 'Inactive'}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{new Date(user.createdAt).toLocaleDateString()}
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
													<Link href={`/admin/users/${user.id}`}>
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
