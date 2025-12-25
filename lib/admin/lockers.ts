import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import { z } from 'zod';

export const lockerSchema = z.object({
	name: z.string().min(1),
	locationText: z.string().min(1),
	timezone: z.string().default('Europe/Tallinn'),
	active: z.boolean().default(true),
});

export async function createLocker(
	data: z.infer<typeof lockerSchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = lockerSchema.parse(data);

	const locker = await prisma.locker.create({
		data: validated,
		include: {
			_count: {
				select: {
					compartments: true,
				},
			},
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'locker',
		entityId: locker.id,
		afterJson: locker,
		ip,
	});

	return locker;
}

export async function updateLocker(
	lockerId: string,
	data: Partial<z.infer<typeof lockerSchema>>,
	actorUserId: string,
	ip?: string,
) {
	const locker = await prisma.locker.findUnique({
		where: { id: lockerId },
	});

	if (!locker) {
		throw new Error('Locker not found');
	}

	const updated = await prisma.locker.update({
		where: { id: lockerId },
		data,
		include: {
			_count: {
				select: {
					compartments: true,
				},
			},
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'locker',
		entityId: lockerId,
		beforeJson: locker,
		afterJson: updated,
		ip,
	});

	return updated;
}

export async function deleteLocker(lockerId: string, actorUserId: string, ip?: string) {
	const locker = await prisma.locker.findUnique({
		where: { id: lockerId },
	});

	if (!locker) {
		throw new Error('Locker not found');
	}

	await prisma.locker.delete({
		where: { id: lockerId },
	});

	await createAuditLog({
		actorUserId,
		action: 'delete',
		entityType: 'locker',
		entityId: lockerId,
		beforeJson: locker,
		ip,
	});
}
