import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create categories
  const categories = [
    {
      slug: 'aiatoo',
      name: 'Aiatöö',
      description: 'Muruhooldus ja õuetööd',
      icon: '🪴',
      order: 1,
    },
    {
      slug: 'puurimine-kinnitamine',
      name: 'Puurimine & kinnitamine',
      description: 'Trellid ja kinnitustööd',
      icon: '🧰',
      order: 2,
    },
    {
      slug: 'loikamine-saagimine',
      name: 'Lõikamine & saagimine',
      description: 'Saed ja lõiketööd',
      icon: '🪚',
      order: 3,
    },
    {
      slug: 'lihvimine-viimistlus',
      name: 'Lihvimine & viimistlus',
      description: 'Lihv, frees, poleerimine',
      icon: '🧽',
      order: 4,
    },
    {
      slug: 'puhastus',
      name: 'Puhastus',
      description: 'Survepesu ja tolmuvaba töö',
      icon: '🧼',
      order: 5,
    },
    {
      slug: 'betoon-kivi',
      name: 'Betoon & kivimaterjal',
      description: 'Kivi ja betooni tööriistad',
      icon: '🧱',
      order: 6,
    },
    {
      slug: 'moodistamine-markimine',
      name: 'Mõõdistamine & märkimine',
      description: 'Täpne mõõt ja nivoo',
      icon: '📏',
      order: 7,
    },
    {
      slug: 'tostmine-transport',
      name: 'Tõstmine & transport',
      description: 'Liigutamine ja tõstmine',
      icon: '🛠️',
      order: 8,
    },
    {
      slug: 'tarvikud-kulumaterjal',
      name: 'Tarvikud & kulumaterjal',
      description: 'Otsikud, kettad, akud, lisad',
      icon: '🔩',
      order: 9,
    },
  ]

  const createdCategories = []
  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: categoryData,
      create: categoryData,
    })
    createdCategories.push(category)
    console.log(`Created/updated category: ${category.name}`)
  }

  // Create sample locker
  const locker = await prisma.locker.upsert({
    where: { id: 'default-locker' },
    update: {},
    create: {
      id: 'default-locker',
      name: 'Kesklinna kapp',
      locationText: 'Tallinn, Kesklinna',
      timezone: 'Europe/Tallinn',
    },
  })
  console.log(`Created/updated locker: ${locker.name}`)

  // Create sample products
  const sampleProducts = [
    {
      slug: 'makita-akupuur',
      name: 'Makita akupuur',
      shortDescription: 'Võimas akupuur kõigeks',
      description: 'Professionaalne Makita akupuur kõigi vajalike lisadega. Sobib nii puurimiseks kui kruvimiseks.',
      categoryId: createdCategories[1].id, // Puurimine & kinnitamine
      tags: ['Makita', 'puurimine', 'ehitus'],
      basePrice: 12.5,
      priceUnit: 'hour',
      images: ['/images/makita-drill.jpg'],
    },
    {
      slug: 'karcher-survepesur',
      name: 'Kärcher survepesur',
      shortDescription: 'Võimas survepesur',
      description: 'Kärcher survepesur kõrge survega. Ideaalne autode, terrasside ja õueala puhastamiseks.',
      categoryId: createdCategories[4].id, // Puhastus
      tags: ['Kärcher', 'puhastus'],
      basePrice: 25.0,
      priceUnit: 'day',
      images: ['/images/karcher-pressure-washer.jpg'],
    },
    {
      slug: 'muruviimistlusmasin',
      name: 'Muruviimistlusmasin',
      shortDescription: 'Professionaalne muruhooldus',
      description: 'Võimas muruviimistlusmasin suuremate alade jaoks.',
      categoryId: createdCategories[0].id, // Aiatöö
      tags: ['aiatöö', 'muruhooldus'],
      basePrice: 18.0,
      priceUnit: 'day',
      images: ['/images/lawn-mower.jpg'],
    },
    {
      slug: 'ketassaag',
      name: 'Ketassaag',
      shortDescription: 'Täpne lõikamine',
      description: 'Professionaalne ketassaag puidu ja materjalide lõikamiseks.',
      categoryId: createdCategories[2].id, // Lõikamine & saagimine
      tags: ['lõikamine', 'ehitus'],
      basePrice: 15.0,
      priceUnit: 'hour',
      images: ['/images/circular-saw.jpg'],
    },
  ]

  for (const productData of sampleProducts) {
    const product = await prisma.product.upsert({
      where: {
        categoryId_slug: {
          categoryId: productData.categoryId,
          slug: productData.slug,
        },
      },
      update: productData,
      create: productData,
    })
    console.log(`Created/updated product: ${product.name}`)

    // Create sample compartments for each product
    const compartmentCount = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < compartmentCount; i++) {
      await prisma.compartment.upsert({
        where: {
          id: `${product.id}-comp-${i}`,
        },
        update: {},
        create: {
          id: `${product.id}-comp-${i}`,
          lockerId: locker.id,
          productId: product.id,
          label: `Kapp ${i + 1}`,
          active: true,
        },
      })
    }
    console.log(`Created ${compartmentCount} compartments for ${product.name}`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
