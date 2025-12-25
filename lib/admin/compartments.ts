import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import { z } from 'zod';

export const compartmentSchema = z.object({
	lockerId: z.string().min(1),
	label: z.string().min(1),
	productId: z.string().optional().nullable(),
	active: z.boolean().default(true),
	notes: z.string().optional(),
});

export async function createCompartment(
	data: z.infer<typeof compartmentSchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = compartmentSchema.parse(data);

	const existing = await prisma.compartment.findUnique({
		where: {
			lockerId_label: {
				lockerId: validated.lockerId,
				label: validated.label,
			},
		},
	});

	if (existing) {
		throw new Error('Compartment with this label already exists in this locker');
	}

	const compartment = await prisma.compartment.create({
		data: validated,
		include: {
			locker: true,
			product: true,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'compartment',
		entityId: compartment.id,
		afterJson: compartment,
		ip,
	});

	return compartment;
}

export async function updateCompartment(
	compartmentId: string,
	data: Partial<z.infer<typeof compartmentSchema>>,
	actorUserId: string,
	ip?: string,
) {
	const compartment = await prisma.compartment.findUnique({
		where: { id: compartmentId },
	});

	if (!compartment) {
		throw new Error('Compartment not found');
	}

	if (data.label && data.label !== compartment.label) {
		const existing = await prisma.compartment.findUnique({
			where: {
				lockerId_label: {
					lockerId: data.lockerId || compartment.lockerId,
					label: data.label,
				},
			},
		});

		if (existing) {
			throw new Error('Compartment with this label already exists in this locker');
		}
	}

	const updated = await prisma.compartment.update({
		where: { id: compartmentId },
		data,
		include: {
			locker: true,
			product: true,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'compartment',
		entityId: compartmentId,
		beforeJson: compartment,
		afterJson: updated,
		ip,
	});

	return updated;
}

export async function deleteCompartment(compartmentId: string, actorUserId: string, ip?: string) {
	const compartment = await prisma.compartment.findUnique({
		where: { id: compartmentId },
	});

	if (!compartment) {
		throw new Error('Compartment not found');
	}

	await prisma.compartment.delete({
		where: { id: compartmentId },
	});

	await createAuditLog({
		actorUserId,
		action: 'delete',
		entityType: 'compartment',
		entityId: compartmentId,
		beforeJson: compartment,
		ip,
	});
}
