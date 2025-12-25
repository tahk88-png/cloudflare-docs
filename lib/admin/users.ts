import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export const userSchema = z.object({
	email: z.string().email(),
	name: z.string().optional().nullable(),
	role: z.enum(['owner', 'admin', 'operator', 'viewer']),
	active: z.boolean().default(true),
	password: z.string().min(8).optional(),
});

export async function createUser(
	data: z.infer<typeof userSchema>,
	actorUserId: string,
	ip?: string,
) {
	const validated = userSchema.parse(data);

	const existing = await prisma.user.findUnique({
		where: { email: validated.email },
	});

	if (existing) {
		throw new Error('User with this email already exists');
	}

	const user = await prisma.user.create({
		data: {
			email: validated.email,
			name: validated.name,
			role: validated.role as UserRole,
			active: validated.active,
		},
	});

	await createAuditLog({
		actorUserId,
		action: 'create',
		entityType: 'user',
		entityId: user.id,
		afterJson: { ...user, password: '[REDACTED]' },
		ip,
	});

	return user;
}

export async function updateUser(
	userId: string,
	data: Partial<z.infer<typeof userSchema>>,
	actorUserId: string,
	ip?: string,
) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		throw new Error('User not found');
	}

	const updateData: any = { ...data };
	delete updateData.password; // Password updates handled separately

	if (data.email && data.email !== user.email) {
		const existing = await prisma.user.findUnique({
			where: { email: data.email },
		});

		if (existing) {
			throw new Error('User with this email already exists');
		}
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: updateData,
	});

	await createAuditLog({
		actorUserId,
		action: 'update',
		entityType: 'user',
		entityId: userId,
		beforeJson: { ...user, password: '[REDACTED]' },
		afterJson: { ...updated, password: '[REDACTED]' },
		ip,
	});

	return updated;
}

export async function deleteUser(userId: string, actorUserId: string, ip?: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		throw new Error('User not found');
	}

	await prisma.user.delete({
		where: { id: userId },
	});

	await createAuditLog({
		actorUserId,
		action: 'delete',
		entityType: 'user',
		entityId: userId,
		beforeJson: { ...user, password: '[REDACTED]' },
		ip,
	});
}
