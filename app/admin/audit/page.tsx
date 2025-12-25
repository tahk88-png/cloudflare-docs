import { prisma } from '@/lib/db';
import { formatInRentboxTimeZone } from '@/lib/timezone';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

async function getAuditLogs(
	actorUserId?: string,
	entityType?: string,
	action?: string,
	dateFrom?: string,
	dateTo?: string,
) {
	const where: any = {};

	if (actorUserId) {
		where.actorUserId = actorUserId;
	}

	if (entityType) {
		where.entityType = entityType;
	}

	if (action) {
		where.action = action;
	}

	if (dateFrom || dateTo) {
		where.createdAt = {};
		if (dateFrom) {
			where.createdAt.gte = new Date(dateFrom);
		}
		if (dateTo) {
			where.createdAt.lte = new Date(dateTo);
		}
	}

	return await prisma.auditLog.findMany({
		where,
		include: {
			actor: {
				select: {
					email: true,
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: 500,
	});
}

const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'success'> = {
	create: 'success',
	update: 'default',
	delete: 'destructive',
	status_change: 'secondary',
};

export default async function AuditPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const actorUserId = searchParams.actorUserId as string | undefined;
	const entityType = searchParams.entityType as string | undefined;
	const action = searchParams.action as string | undefined;
	const dateFrom = searchParams.dateFrom as string | undefined;
	const dateTo = searchParams.dateTo as string | undefined;

	const logs = await getAuditLogs(actorUserId, entityType, action, dateFrom, dateTo);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Audit Log</h1>
				<p className="text-muted-foreground">Track all changes made in the system</p>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Timestamp</TableHead>
							<TableHead>Actor</TableHead>
							<TableHead>Action</TableHead>
							<TableHead>Entity</TableHead>
							<TableHead>Entity ID</TableHead>
							<TableHead>IP</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{logs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground">
									No audit logs found
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => (
								<TableRow key={log.id}>
									<TableCell className="text-sm">
										{formatInRentboxTimeZone(log.createdAt, 'MMM d, yyyy HH:mm:ss')}
									</TableCell>
									<TableCell>{log.actor.email}</TableCell>
									<TableCell>
										<Badge variant={actionColors[log.action] || 'default'}>
											{log.action}
										</Badge>
									</TableCell>
									<TableCell>{log.entityType}</TableCell>
									<TableCell className="font-mono text-xs">{log.entityId}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{log.ip || '-'}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
