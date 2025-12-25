/**
 * Seed script for Rentbox Tööriistad catalog
 * 
 * This file contains the seed data for categories, products, and lockers.
 * In a real application with Prisma, you would use this to populate the database.
 * 
 * Run with: npm run seed
 * 
 * Note: Currently, the data is stored in-memory in /src/lib/catalog/data.ts
 * This file serves as a reference for database migration.
 */

// Types matching Prisma schema
interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  active: boolean;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  tags: string[];
  basePrice: number;
  priceUnit: 'hour' | 'day';
  images: string[];
  specs: { label: string; value: string }[];
  includes: string[];
  active: boolean;
  createdAt: Date;
}

interface Locker {
  id: string;
  name: string;
  locationText: string;
  timezone: string;
}

interface Compartment {
  id: string;
  lockerId: string;
  productId: string;
  label: string;
  active: boolean;
}

// =============================================================================
// SEED DATA - Categories (LOCKED as per requirements)
// =============================================================================
const categories: Category[] = [
  {
    id: "cat-1",
    slug: "aiatoo",
    name: "Aiatöö",
    description: "Muruhooldus ja õuetööd",
    icon: "🪴",
    order: 1,
    active: true,
  },
  {
    id: "cat-2",
    slug: "puurimine-kinnitamine",
    name: "Puurimine & kinnitamine",
    description: "Trellid ja kinnitustööd",
    icon: "🧰",
    order: 2,
    active: true,
  },
  {
    id: "cat-3",
    slug: "loikamine-saagimine",
    name: "Lõikamine & saagimine",
    description: "Saed ja lõiketööd",
    icon: "🪚",
    order: 3,
    active: true,
  },
  {
    id: "cat-4",
    slug: "lihvimine-viimistlus",
    name: "Lihvimine & viimistlus",
    description: "Lihv, frees, poleerimine",
    icon: "🧽",
    order: 4,
    active: true,
  },
  {
    id: "cat-5",
    slug: "puhastus",
    name: "Puhastus",
    description: "Survepesu ja tolmuvaba töö",
    icon: "🧼",
    order: 5,
    active: true,
  },
  {
    id: "cat-6",
    slug: "betoon-kivi",
    name: "Betoon & kivimaterjal",
    description: "Kivi ja betooni tööriistad",
    icon: "🧱",
    order: 6,
    active: true,
  },
  {
    id: "cat-7",
    slug: "moodistamine-markimine",
    name: "Mõõdistamine & märkimine",
    description: "Täpne mõõt ja nivoo",
    icon: "📏",
    order: 7,
    active: true,
  },
  {
    id: "cat-8",
    slug: "tostmine-transport",
    name: "Tõstmine & transport",
    description: "Liigutamine ja tõstmine",
    icon: "🛠️",
    order: 8,
    active: true,
  },
  {
    id: "cat-9",
    slug: "tarvikud-kulumaterjal",
    name: "Tarvikud & kulumaterjal",
    description: "Otsikud, kettad, akud, lisad",
    icon: "🔩",
    order: 9,
    active: true,
  },
];

// =============================================================================
// SEED DATA - Lockers
// =============================================================================
const lockers: Locker[] = [
  {
    id: "locker-1",
    name: "Tallinn Ülemiste",
    locationText: "Ülemiste City, Tallinn",
    timezone: "Europe/Tallinn",
  },
  {
    id: "locker-2",
    name: "Tallinn Kesklinn",
    locationText: "Viru Keskus, Tallinn",
    timezone: "Europe/Tallinn",
  },
  {
    id: "locker-3",
    name: "Tartu",
    locationText: "Lõunakeskus, Tartu",
    timezone: "Europe/Tallinn",
  },
];

// =============================================================================
// SEED DATA - Sample Products (15 products across categories)
// =============================================================================
const products: Omit<Product, 'createdAt'>[] = [
  // Aiatöö (cat-1)
  {
    id: "prod-1",
    slug: "makita-muruniiduk-36v",
    name: "Makita muruniiduk 36V",
    shortDescription: "Võimas akuga muruniiduk kuni 500m² murule",
    description: "Professionaalne Makita akuga muruniiduk, mis sobib ideaalselt keskmise suurusega aiale. Vaikne töö, null emissiooni ja mugav kasutada. Komplektis 2x 18V 5Ah akut ja topeltlaadija.",
    categoryId: "cat-1",
    tags: ["Makita", "aiatöö", "aku"],
    basePrice: 25,
    priceUnit: "day",
    images: ["/images/products/makita-muruniiduk.jpg"],
    specs: [
      { label: "Lõikelaius", value: "43 cm" },
      { label: "Lõikekõrgus", value: "20-75 mm" },
      { label: "Aku", value: "2x 18V 5.0Ah" },
      { label: "Kaal", value: "16.5 kg" },
    ],
    includes: ["Muruniiduk", "2x aku 18V 5.0Ah", "Topeltlaadija", "Kasutusjuhend"],
    active: true,
  },
  {
    id: "prod-2",
    slug: "stihl-trimmer-fsa-57",
    name: "Stihl trimmer FSA 57",
    shortDescription: "Kerge ja võimas trimmer servade viimistluseks",
    description: "Stihl FSA 57 on ideaalne kodukasutajale, kes otsib kerget aga efektiivset trimmerit.",
    categoryId: "cat-1",
    tags: ["Stihl", "aiatöö", "aku"],
    basePrice: 15,
    priceUnit: "day",
    images: ["/images/products/stihl-trimmer.jpg"],
    specs: [
      { label: "Lõikediameeter", value: "33 cm" },
      { label: "Aku", value: "AK 10" },
      { label: "Kaal", value: "2.6 kg" },
    ],
    includes: ["Trimmer", "Aku AK 10", "Laadija", "Nöölidoos"],
    active: true,
  },
  // ... More products defined in data.ts
];

// =============================================================================
// SEED FUNCTION
// =============================================================================
async function main() {
  console.log('🌱 Seeding Rentbox Tööriistad catalog...\n');

  // In a real Prisma setup, you would do:
  // 
  // // Clear existing data
  // await prisma.compartment.deleteMany();
  // await prisma.product.deleteMany();
  // await prisma.category.deleteMany();
  // await prisma.locker.deleteMany();
  //
  // // Insert categories
  // for (const category of categories) {
  //   await prisma.category.create({ data: category });
  // }
  //
  // // Insert lockers
  // for (const locker of lockers) {
  //   await prisma.locker.create({ data: locker });
  // }
  //
  // // Insert products
  // for (const product of products) {
  //   await prisma.product.create({ data: { ...product, createdAt: new Date() } });
  // }

  console.log('📦 Categories to seed:');
  categories.forEach(cat => {
    console.log(`   ${cat.icon} ${cat.name} (${cat.slug})`);
  });

  console.log('\n📍 Lockers to seed:');
  lockers.forEach(locker => {
    console.log(`   ${locker.name} - ${locker.locationText}`);
  });

  console.log('\n🔧 Products to seed:', products.length);
  
  console.log('\n✅ Seed data prepared!');
  console.log('\nNote: Data is currently stored in-memory at /src/lib/catalog/data.ts');
  console.log('To use with Prisma, implement the database connection and uncomment the seed logic above.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  });
