import bcrypt from "bcryptjs";
import { PrismaClient, Role, PriceUnit } from "@prisma/client";

const prisma = new PrismaClient();

function requiredEnv(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing required env var: ${name}`);
	return v;
}

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

async function main() {
	const ownerEmail = requiredEnv("RENTBOX_OWNER_EMAIL").toLowerCase();
	const ownerPassword = requiredEnv("RENTBOX_OWNER_PASSWORD");

	const passwordHash = await bcrypt.hash(ownerPassword, 12);

	await prisma.user.upsert({
		where: { email: ownerEmail },
		update: { role: Role.owner, active: true, passwordHash },
		create: {
			email: ownerEmail,
			name: "Owner",
			role: Role.owner,
			active: true,
			passwordHash,
		},
	});

	// Ensure singleton settings row exists.
	await prisma.settings.upsert({
		where: { id: 1 },
		update: {},
		create: { id: 1 },
	});

	// “Locked” baseline categories (adjust as needed for Rentbox catalog).
	const categoryNames = [
		"Power tools",
		"Garden",
		"Cleaning",
		"Construction",
		"Automotive",
	];

	for (let i = 0; i < categoryNames.length; i++) {
		const name = categoryNames[i]!;
		await prisma.category.upsert({
			where: { slug: slugify(name) },
			update: { name, order: i, active: true },
			create: {
				slug: slugify(name),
				name,
				order: i,
				active: true,
			},
		});
	}

	// Seed a sample tag + product only if empty, so environments stay predictable.
	const productsCount = await prisma.product.count();
	if (productsCount === 0) {
		const tag = await prisma.tag.upsert({
			where: { slug: "popular" },
			update: { name: "Popular", active: true },
			create: { slug: "popular", name: "Popular", active: true },
		});

		const category = await prisma.category.findFirst({
			orderBy: { order: "asc" },
		});
		if (category) {
			const product = await prisma.product.create({
				data: {
					slug: "cordless-drill",
					name: "Cordless Drill",
					shortDescription: "18V cordless drill",
					description: "A reliable drill for everyday jobs.",
					categoryId: category.id,
					basePrice: 990, // €9.90
					priceUnit: PriceUnit.day,
					slotMinutes: 15,
					minRentalMinutes: 60,
					active: true,
				},
			});

			await prisma.productTag.create({
				data: { productId: product.id, tagId: tag.id },
			});
		}
	}
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});

