import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  {
    name: 'Aiatöö',
    slug: 'aiatoo',
    icon: '🪴',
    description: 'Muruhooldus ja õuetööd',
    order: 1
  },
  {
    name: 'Puurimine & kinnitamine',
    slug: 'puurimine-kinnitamine',
    icon: '🧰',
    description: 'Trellid ja kinnitustööd',
    order: 2
  },
  {
    name: 'Lõikamine & saagimine',
    slug: 'loikamine-saagimine',
    icon: '🪚',
    description: 'Saed ja lõiketööd',
    order: 3
  },
  {
    name: 'Lihvimine & viimistlus',
    slug: 'lihvimine-viimistlus',
    icon: '🧽',
    description: 'Lihv, frees, poleerimine',
    order: 4
  },
  {
    name: 'Puhastus',
    slug: 'puhastus',
    icon: '🧼',
    description: 'Survepesu ja tolmuvaba töö',
    order: 5
  },
  {
    name: 'Betoon & kivimaterjal',
    slug: 'betoon-kivi',
    icon: '🧱',
    description: 'Kivi ja betooni tööriistad',
    order: 6
  },
  {
    name: 'Mõõdistamine & märkimine',
    slug: 'moodistamine-markimine',
    icon: '📏',
    description: 'Täpne mõõt ja nivoo',
    order: 7
  },
  {
    name: 'Tõstmine & transport',
    slug: 'tostmine-transport',
    icon: '🛠️',
    description: 'Liigutamine ja tõstmine',
    order: 8
  },
  {
    name: 'Tarvikud & kulumaterjal',
    slug: 'tarvikud-kulumaterjal',
    icon: '🔩',
    description: 'Otsikud, kettad, akud, lisad',
    order: 9
  }
]

const sampleProducts = [
  {
    name: 'Akutrell Makita DDF484',
    slug: 'akutrell-makita-ddf484',
    categorySlug: 'puurimine-kinnitamine',
    short_description: 'Võimas ja vastupidav akutrell igapäevaseks kasutamiseks.',
    description: 'Makita DDF484 on professionaalne akutrell, mis sobib nii puurimiseks kui ka kruvide keeramiseks. Harjavaba mootor tagab pika eluea.',
    base_price: 5.00,
    price_unit: 'hour',
    tags: 'Makita, puurimine, ehitus',
    images: '["/placeholder.png"]'
  },
  {
    name: 'Survepesur Kärcher K5',
    slug: 'survepesur-karcher-k5',
    categorySlug: 'puhastus',
    short_description: 'Kõrgsurvepesur terrasside ja autode pesuks.',
    description: 'Kärcher K5 on ideaalne vahend keskmise määrdumisastmega pindade puhastamiseks. Komplektis on pesupüstol ja voolik.',
    base_price: 15.00,
    price_unit: 'day',
    tags: 'Kärcher, puhastus, aiatöö',
    images: '["/placeholder.png"]'
  },
  {
    name: 'Murutrimmer Husqvarna',
    slug: 'murutrimmer-husqvarna',
    categorySlug: 'aiatoo',
    short_description: 'Kerge ja mugav trimmer aia hooldamiseks.',
    description: 'Husqvarna murutrimmer sobib suurepäraselt muruäärte ja raskesti ligipääsetavate kohtade niitmiseks.',
    base_price: 8.00,
    price_unit: 'hour',
    tags: 'Husqvarna, aiatöö, muru',
    images: '["/placeholder.png"]'
  }
]

async function main() {
  console.log('Seeding categories...')
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    })
  }

  console.log('Seeding products...')
  for (const prod of sampleProducts) {
    const cat = await prisma.category.findUnique({ where: { slug: prod.categorySlug } })
    if (cat) {
      await prisma.product.upsert({
        where: { slug: prod.slug },
        update: {
          name: prod.name,
          short_description: prod.short_description,
          description: prod.description,
          base_price: prod.base_price,
          price_unit: prod.price_unit,
          tags: prod.tags,
          images: prod.images,
          categoryId: cat.id
        },
        create: {
          name: prod.name,
          slug: prod.slug,
          short_description: prod.short_description,
          description: prod.description,
          base_price: prod.base_price,
          price_unit: prod.price_unit,
          tags: prod.tags,
          images: prod.images,
          categoryId: cat.id
        }
      })
    }
  }
  
  // Seed lockers and compartments
  const locker = await prisma.locker.create({
    data: {
      name: 'Tallinn Kesklinn',
      location_text: 'Viru Keskus, 1. korrus',
      compartments: {
        create: [
            { label: 'A1', active: true },
            { label: 'A2', active: true },
            { label: 'B1', active: true }
        ]
      }
    }
  })

  // Assign products to compartments
  const products = await prisma.product.findMany()
  const compartments = await prisma.compartment.findMany({ where: { lockerId: locker.id } })
  
  if (products.length > 0 && compartments.length > 0) {
     await prisma.compartment.update({
         where: { id: compartments[0].id },
         data: { productId: products[0].id }
     })
     if (products.length > 1 && compartments.length > 1) {
        await prisma.compartment.update({
            where: { id: compartments[1].id },
            data: { productId: products[1].id }
        })
     }
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
