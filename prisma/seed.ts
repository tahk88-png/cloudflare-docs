import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('Seeding database...');

	// Create owner user
	const owner = await prisma.user.upsert({
		where: { email: 'owner@rentbox.ee' },
		update: {},
		create: {
			email: 'owner@rentbox.ee',
			name: 'Owner',
			role: UserRole.owner,
			active: true,
		},
	});

	console.log('Created owner user:', owner.email);

	// Create default categories
	const categories = [
		{
			name: 'Power Tools',
			slug: 'power-tools',
			description: 'Electric and battery-powered tools',
			order: 1,
		},
		{
			name: 'Hand Tools',
			slug: 'hand-tools',
			description: 'Manual tools',
			order: 2,
		},
		{
			name: 'Garden Tools',
			slug: 'garden-tools',
			description: 'Gardening and landscaping tools',
			order: 3,
		},
	];

	for (const categoryData of categories) {
		const category = await prisma.category.upsert({
			where: { slug: categoryData.slug },
			update: {},
			create: categoryData,
		});
		console.log('Created category:', category.name);
	}

	console.log('Seeding completed!');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
