import { prisma } from '@/lib/db';
import { formatInRentboxTimeZone } from '@/lib/timezone';
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
import { BookingStatus } from '@prisma/client';
import { MoreHorizontal, Eye } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

async function getBookings(searchParams: { [key: string]: string | string[] | undefined }) {
	const status = searchParams.status as BookingStatus | undefined;
	const lockerId = searchParams.lockerId as string | undefined;
	const productId = searchParams.productId as string | undefined;
	const compartmentId = searchParams.compartmentId as string | undefined;
	const dateFrom = searchParams.dateFrom as string | undefined;
	const dateTo = searchParams.dateTo as string | undefined;

	const where: any = {};

	if (status) {
		where.status = status;
	}

	if (lockerId) {
		where.compartment = {
			lockerId,
		};
	}

	if (productId) {
		where.productId = productId;
	}

	if (compartmentId) {
		where.compartmentId = compartmentId;
	}

	if (dateFrom || dateTo) {
		where.startsAt = {};
		if (dateFrom) {
			where.startsAt.gte = new Date(dateFrom);
		}
		if (dateTo) {
			where.startsAt.lte = new Date(dateTo);
		}
	}

	const bookings = await prisma.booking.findMany({
		where,
		include: {
			product: true,
			compartment: {
				include: {
					locker: true,
				},
			},
			user: true,
		},
		orderBy: {
			startsAt: 'desc',
		},
		take: 100,
	});

	return bookings;
}

const statusColors: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'success'> = {
	pending: 'secondary',
	confirmed: 'default',
	cancelled: 'destructive',
	completed: 'success',
};

export default async function BookingsPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const bookings = await getBookings(searchParams);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Bookings</h1>
					<p className="text-muted-foreground">Manage all rental bookings</p>
				</div>
				<Button asChild>
					<Link href="/admin/bookings/new">New Booking</Link>
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date/Time</TableHead>
							<TableHead>Product</TableHead>
							<TableHead>Compartment</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>User</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="w-[70px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{bookings.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className="text-center text-muted-foreground">
									No bookings found
								</TableCell>
							</TableRow>
						) : (
							bookings.map((booking) => (
								<TableRow key={booking.id}>
									<TableCell>
										<div className="text-sm">
											{formatInRentboxTimeZone(booking.startsAt, 'MMM d, yyyy HH:mm')}
										</div>
										<div className="text-xs text-muted-foreground">
											to {formatInRentboxTimeZone(booking.endsAt, 'HH:mm')}
										</div>
									</TableCell>
									<TableCell>{booking.product.name}</TableCell>
									<TableCell>{booking.compartment.label}</TableCell>
									<TableCell>{booking.compartment.locker.name}</TableCell>
									<TableCell>{booking.user?.email || 'Guest'}</TableCell>
									<TableCell>
										<Badge variant={statusColors[booking.status]}>{booking.status}</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatInRentboxTimeZone(booking.createdAt, 'MMM d, yyyy')}
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
													<Link href={`/admin/bookings/${booking.id}`}>
														<Eye className="mr-2 h-4 w-4" />
														View
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
