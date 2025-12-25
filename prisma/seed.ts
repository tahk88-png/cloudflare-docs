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

	// Create locked Estonian categories (as per requirements)
	const categories = [
		{
			name: 'Aiatöö',
			slug: 'aiatoo',
			description: 'Aiatööriistad ja -tarvikud',
			order: 1,
			icon: '🌱',
		},
		{
			name: 'Puurimine & kinnitamine',
			slug: 'puurimine-kinnitamine',
			description: 'Puurid, kruvikeerajad, kinnitustööriistad',
			order: 2,
			icon: '🔩',
		},
		{
			name: 'Lõikamine & saagimine',
			slug: 'loikamine-saagimine',
			description: 'Saed, lõikurid, lõiketööriistad',
			order: 3,
			icon: '✂️',
		},
		{
			name: 'Lihvimine & viimistlus',
			slug: 'lihvimine-viimistlus',
			description: 'Lihvijad, viimistlustööriistad',
			order: 4,
			icon: '✨',
		},
		{
			name: 'Puhastus',
			slug: 'puhastus',
			description: 'Puhastustööriistad ja seadmed',
			order: 5,
			icon: '🧹',
		},
		{
			name: 'Betoon & kivi',
			slug: 'betoon-kivi',
			description: 'Betooni- ja kivitööriistad',
			order: 6,
			icon: '🧱',
		},
		{
			name: 'Mõõdistamine & märkimine',
			slug: 'moodistamine-markimine',
			description: 'Mõõdulint, tasemed, märgistustööriistad',
			order: 7,
			icon: '📏',
		},
		{
			name: 'Tõstmine & transport',
			slug: 'tostmine-transport',
			description: 'Tõsteseadmed, käru, transport',
			order: 8,
			icon: '🚚',
		},
		{
			name: 'Tarvikud & kulumaterjal',
			slug: 'tarvikud-kulumaterjal',
			description: 'Tarvikud, kulumaterjalid, varuosad',
			order: 9,
			icon: '📦',
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
