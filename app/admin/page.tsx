import { prisma } from '@/lib/db';
import { nowInRentboxTimeZone } from '@/lib/timezone';
import {
	getSystemHealth,
	getBookingIntelligence,
	getProductIntelligence,
} from '@/lib/admin/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Calendar, Package, Box, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default async function AdminDashboard() {
	const now = nowInRentboxTimeZone();
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);
	const next24h = new Date(now);
	next24h.setHours(now.getHours() + 24);

	// Operations Intelligence
	const [systemHealth, bookingIntel, productIntel, activeProducts, activeCompartments, disabledCompartments] =
		await Promise.all([
			getSystemHealth(),
			getBookingIntelligence(),
			getProductIntelligence(),
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

			{/* System Health */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						System Health
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-4">
						<div>
							<div className="text-2xl font-bold">
								{systemHealth.lockersOnline} / {systemHealth.lockersTotal}
							</div>
							<p className="text-sm text-muted-foreground">Lockers Online</p>
						</div>
						<div>
							<div className="text-2xl font-bold">{systemHealth.doorErrors}</div>
							<p className="text-sm text-muted-foreground">Door Errors</p>
						</div>
						<div>
							<div className="text-2xl font-bold">{systemHealth.lockErrors}</div>
							<p className="text-sm text-muted-foreground">Lock Errors</p>
						</div>
						{systemHealth.lastOpenEvent && (
							<div>
								<div className="text-sm font-medium">
									{new Date(systemHealth.lastOpenEvent).toLocaleString()}
								</div>
								<p className="text-sm text-muted-foreground">Last Open Event</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Booking Intelligence */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Booking Intelligence
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-5">
						<div>
							<div className="text-2xl font-bold">{bookingIntel.todayBookings}</div>
							<p className="text-sm text-muted-foreground">Today</p>
						</div>
						<div>
							<div className="text-2xl font-bold">{bookingIntel.next24hBookings}</div>
							<p className="text-sm text-muted-foreground">Next 24h</p>
						</div>
						<div>
							<div className="text-2xl font-bold">{bookingIntel.fullyBookedCompartments}</div>
							<p className="text-sm text-muted-foreground">Fully Booked</p>
						</div>
						<div>
							<div className="text-2xl font-bold text-destructive">
								{bookingIntel.overdueReturns}
							</div>
							<p className="text-sm text-muted-foreground">Overdue</p>
						</div>
						<div>
							<div className="text-2xl font-bold text-destructive">{bookingIntel.conflicts}</div>
							<p className="text-sm text-muted-foreground">Conflicts</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Product Intelligence */}
			{productIntel.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5" />
							Product Intelligence
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Product</TableHead>
										<TableHead>Usage Hours</TableHead>
										<TableHead>Avg Duration</TableHead>
										<TableHead>Revenue</TableHead>
										<TableHead>Maintenance</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{productIntel.slice(0, 10).map((product) => (
										<TableRow key={product.productId}>
											<TableCell className="font-medium">{product.productName}</TableCell>
											<TableCell>{product.usageHours}h</TableCell>
											<TableCell>{product.avgRentalDuration}h</TableCell>
											<TableCell>{formatCurrency(product.revenue)}</TableCell>
											<TableCell>{product.maintenanceCount}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Alerts */}
			<div className="space-y-4">
				{bookingIntel.conflicts > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Booking Conflicts Detected</AlertTitle>
						<AlertDescription>
							{bookingIntel.conflicts} booking conflict(s) found. Please review and resolve.
						</AlertDescription>
					</Alert>
				)}

				{bookingIntel.overdueReturns > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Overdue Returns</AlertTitle>
						<AlertDescription>
							{bookingIntel.overdueReturns} booking(s) are overdue. Take action immediately.
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

				{bookingIntel.fullyBookedCompartments > 0 && (
					<Alert>
						<AlertTitle>High Demand Compartments</AlertTitle>
						<AlertDescription>
							{bookingIntel.fullyBookedCompartments} compartment(s) are fully booked today.
						</AlertDescription>
					</Alert>
				)}
			</div>
		</div>
	);
}
