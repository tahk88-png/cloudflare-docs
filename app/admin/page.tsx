import { prisma } from '@/lib/db';
import { nowInRentboxTimeZone } from '@/lib/timezone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Calendar, Package, Box } from 'lucide-react';

export default async function AdminDashboard() {
	const now = nowInRentboxTimeZone();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);
	const next24h = new Date(now);
	next24h.setHours(now.getHours() + 24);

	// KPIs
	const [todayBookings, upcomingBookings, activeProducts, activeCompartments, disabledCompartments] =
		await Promise.all([
			prisma.booking.count({
				where: {
					startsAt: {
						gte: todayStart,
						lte: todayEnd,
					},
					status: {
						in: ['pending', 'confirmed'],
					},
				},
			}),
			prisma.booking.count({
				where: {
					startsAt: {
						gte: now,
						lte: next24h,
					},
					status: {
						in: ['pending', 'confirmed'],
					},
				},
			}),
			prisma.product.count({
				where: { active: true },
			}),
			prisma.compartment.count({
				where: { active: true },
			}),
			prisma.compartment.count({
				where: { active: false },
			}),
		]);

	// Check for conflicts (overlapping bookings)
	const conflicts = await prisma.$queryRaw<Array<{ id: string; compartmentId: string }>>`
		SELECT DISTINCT b1.id, b1."compartmentId"
		FROM "Booking" b1
		INNER JOIN "Booking" b2 ON b1."compartmentId" = b2."compartmentId"
		WHERE b1.id != b2.id
		AND b1.status IN ('pending', 'confirmed')
		AND b2.status IN ('pending', 'confirmed')
		AND (
			(b1."startsAt" < b2."endsAt" AND b1."endsAt" > b2."startsAt")
		)
	`;

	// Fully booked compartments today
	const fullyBookedCompartments = await prisma.$queryRaw<Array<{ compartmentId: string; count: bigint }>>`
		SELECT "compartmentId", COUNT(*) as count
		FROM "Booking"
		WHERE "startsAt" >= ${todayStart}
		AND "startsAt" <= ${todayEnd}
		AND status IN ('pending', 'confirmed')
		GROUP BY "compartmentId"
		HAVING COUNT(*) >= 5
	`;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">Overview of your rental operations</p>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{todayBookings}</div>
						<p className="text-xs text-muted-foreground">Active bookings today</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Upcoming 24h</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{upcomingBookings}</div>
						<p className="text-xs text-muted-foreground">Bookings in next 24 hours</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Products</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{activeProducts}</div>
						<p className="text-xs text-muted-foreground">Available products</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Compartments</CardTitle>
						<Box className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{activeCompartments}</div>
						<p className="text-xs text-muted-foreground">
							{disabledCompartments > 0 && `${disabledCompartments} in maintenance`}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Alerts */}
			<div className="space-y-4">
				{conflicts.length > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Booking Conflicts Detected</AlertTitle>
						<AlertDescription>
							{conflicts.length} booking conflict(s) found. Please review and resolve.
						</AlertDescription>
					</Alert>
				)}

				{disabledCompartments > 0 && (
					<Alert variant="warning">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Compartments in Maintenance</AlertTitle>
						<AlertDescription>
							{disabledCompartments} compartment(s) are currently disabled for maintenance.
						</AlertDescription>
					</Alert>
				)}

				{fullyBookedCompartments.length > 0 && (
					<Alert>
						<AlertTitle>High Demand Compartments</AlertTitle>
						<AlertDescription>
							{fullyBookedCompartments.length} compartment(s) have 5+ bookings today.
						</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
}
