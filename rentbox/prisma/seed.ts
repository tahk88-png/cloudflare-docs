import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const LOCKED_CATEGORIES = [
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

const SAMPLE_PRODUCTS = [
  // Aiatöö
  {
    slug: 'akutrell-makita-18v',
    name: 'Akutrell Makita 18V',
    shortDescription: 'Võimas 18V akutrell kõikideks töödeks',
    description: 'Professionaalne Makita 18V akutrell. Kaasas 2 akut, laadija ja bittide komplekt. Sobib nii puurimiseks kui ka kruvimiseks.',
    categoryId: '', // Will be set dynamically
    tags: JSON.stringify(['Makita', 'akutrell', 'puurimine']),
    basePrice: 8,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  {
    slug: 'muruniitja-elektri',
    name: 'Elektriline muruniitja',
    shortDescription: 'Kerge ja tõhus elektriline muruniitja',
    description: 'Võimas 1800W elektriline muruniitja. Niidulaiuse reguleerimine, kokkuklapitav käepide. Ideaalne väikestele ja keskmise suurusega muruplatside hooldamiseks.',
    categoryId: '',
    tags: JSON.stringify(['muruniitja', 'aiatöö', 'elekter']),
    basePrice: 12,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  // Puhastus
  {
    slug: 'survepesumasin-karcher-k5',
    name: 'Survepesumasin Kärcher K5',
    shortDescription: '150 bar survepesumasin profitasemele',
    description: 'Kärcher K5 survepesumasin 150 bar rõhuga. Sobib terrasside, autode, seinte puhastamiseks. Kaasas erinevad otsikud ja detergendi paak.',
    categoryId: '',
    tags: JSON.stringify(['Kärcher', 'survepesu', 'puhastus']),
    basePrice: 15,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  {
    slug: 'ehitustolmuimeja-bosch',
    name: 'Ehitustolmuimeja Bosch',
    shortDescription: 'Võimas ehitustolmuimeja tolmuvabaks tööks',
    description: 'Bosch professionaalne ehitustolmuimeja. 1200W mootor, automaatne filtripuhastus, 30L mahuti. Sobib kõikideks ehitustöödeks.',
    categoryId: '',
    tags: JSON.stringify(['Bosch', 'tolmuimeja', 'puhastus']),
    basePrice: 10,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
  // Lõikamine & saagimine
  {
    slug: 'ketassaag-dewalt',
    name: 'Ketassaag DeWalt 190mm',
    shortDescription: 'Professionaalne käsiketassaag',
    description: 'DeWalt ketassaag 190mm kettaläbimõõduga. 1500W mootor, täpne lõikenurkade seadistamine. Sobib puit- ja komposiitmaterjali lõikamiseks.',
    categoryId: '',
    tags: JSON.stringify(['DeWalt', 'ketassaag', 'lõikamine']),
    basePrice: 12,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  {
    slug: 'tikksaag-bosch',
    name: 'Tikksaag Bosch Professional',
    shortDescription: 'Täpne tikksaag keerukateks lõigeteks',
    description: 'Bosch Professional tikksaag. Võimaldab teha täpseid kõveraid ja sirgjoonelisi lõikeid. Reguleeritav kiirus ja pendellöök.',
    categoryId: '',
    tags: JSON.stringify(['Bosch', 'tikksaag', 'lõikamine']),
    basePrice: 8,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
  // Lihvimine & viimistlus
  {
    slug: 'ektsentriklihvija-makita',
    name: 'Ektsentriklihvija Makita',
    shortDescription: 'Sujuva viimistluse lihvija',
    description: 'Makita ektsentriklihvija 125mm plaadiga. Tolmukotiga, reguleeritav kiirus. Ideaalne puidule, plastile ja metallile.',
    categoryId: '',
    tags: JSON.stringify(['Makita', 'lihvija', 'viimistlus']),
    basePrice: 9,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
  {
    slug: 'nurklihvija-bosch-125',
    name: 'Nurklihvija Bosch 125mm',
    shortDescription: 'Universaalne nurklihvija',
    description: 'Bosch nurklihvija 125mm ketta läbimõõduga. 850W mootor. Sobib lõikamiseks, lihvimiseks ja poleerimiseks.',
    categoryId: '',
    tags: JSON.stringify(['Bosch', 'nurklihvija', 'lihvimine']),
    basePrice: 7,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  // Mõõdistamine
  {
    slug: 'laserristi-bosch',
    name: 'Laserristi Bosch GLL 3-80',
    shortDescription: 'Täpne 3-tasandiline laserristi',
    description: 'Bosch GLL 3-80 professionaalne laserristi. 3 tasandit, 20m ulatus, statiivikinnitus. Ideaalne sise- ja välitöödeks.',
    categoryId: '',
    tags: JSON.stringify(['Bosch', 'laserristi', 'mõõdistamine']),
    basePrice: 11,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
  {
    slug: 'laserkaugusemootja-leica',
    name: 'Laserkaugusemõõtja Leica',
    shortDescription: 'Professionaalne kaugusemõõtja',
    description: 'Leica laserkaugusemõõtja 80m ulatusega. Mõõdab kaugust, pindala ja ruumala. Bluetooth ühendus nutitelefoniga.',
    categoryId: '',
    tags: JSON.stringify(['Leica', 'lasermõõt', 'mõõdistamine']),
    basePrice: 6,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
  // Betoon & kivi
  {
    slug: 'perforaator-makita-sds',
    name: 'Perforaator Makita SDS-Plus',
    shortDescription: 'Võimas perforaator rasketeks töödeks',
    description: 'Makita SDS-Plus perforaator. 800W, 3 režiimi: puurimine, löökpuurimine, peitlimine. Kaasas komplekt puurisid.',
    categoryId: '',
    tags: JSON.stringify(['Makita', 'perforaator', 'betoon']),
    basePrice: 14,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
    featured: true,
  },
  {
    slug: 'betoonsaag-stihl',
    name: 'Betoonsaag Stihl TS 420',
    shortDescription: 'Professionaalne betooni lõikusaag',
    description: 'Stihl TS 420 betoonsaag 350mm kettaläbimõõduga. Bensiinimootor, märg- ja kuivlõikus. Sobib betooni, asfaldi ja kivi lõikamiseks.',
    categoryId: '',
    tags: JSON.stringify(['Stihl', 'betoonsaag', 'lõikamine']),
    basePrice: 25,
    priceUnit: 'day',
    images: JSON.stringify(['/images/placeholder-tool.jpg']),
  },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await prisma.compartment.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.locker.deleteMany()

  console.log('🗑️  Cleaned existing data')

  // Create categories
  const categories = await Promise.all(
    LOCKED_CATEGORIES.map((cat) =>
      prisma.category.create({
        data: cat,
      })
    )
  )

  console.log(`✅ Created ${categories.length} categories`)

  // Create locker
  const locker = await prisma.locker.create({
    data: {
      name: 'Rentbox Tallinn Keskus',
      locationText: 'Tallinn, Viru väljak 2',
      timezone: 'Europe/Tallinn',
    },
  })

  console.log('✅ Created locker')

  // Map category slugs to IDs
  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]))

  // Create products with correct category IDs
  const productsWithCategories = [
    { ...SAMPLE_PRODUCTS[0], categoryId: categoryMap.get('puurimine-kinnitamine')! },
    { ...SAMPLE_PRODUCTS[1], categoryId: categoryMap.get('aiatoo')! },
    { ...SAMPLE_PRODUCTS[2], categoryId: categoryMap.get('puhastus')! },
    { ...SAMPLE_PRODUCTS[3], categoryId: categoryMap.get('puhastus')! },
    { ...SAMPLE_PRODUCTS[4], categoryId: categoryMap.get('loikamine-saagimine')! },
    { ...SAMPLE_PRODUCTS[5], categoryId: categoryMap.get('loikamine-saagimine')! },
    { ...SAMPLE_PRODUCTS[6], categoryId: categoryMap.get('lihvimine-viimistlus')! },
    { ...SAMPLE_PRODUCTS[7], categoryId: categoryMap.get('lihvimine-viimistlus')! },
    { ...SAMPLE_PRODUCTS[8], categoryId: categoryMap.get('moodistamine-markimine')! },
    { ...SAMPLE_PRODUCTS[9], categoryId: categoryMap.get('moodistamine-markimine')! },
    { ...SAMPLE_PRODUCTS[10], categoryId: categoryMap.get('betoon-kivi')! },
    { ...SAMPLE_PRODUCTS[11], categoryId: categoryMap.get('betoon-kivi')! },
  ]

  const products = await Promise.all(
    productsWithCategories.map((product) =>
      prisma.product.create({
        data: product,
      })
    )
  )

  console.log(`✅ Created ${products.length} products`)

  // Create compartments (2-3 per product for availability variation)
  const compartmentPromises = products.flatMap((product, idx) => {
    const count = idx % 3 === 0 ? 1 : idx % 2 === 0 ? 2 : 3
    return Array.from({ length: count }, (_, i) =>
      prisma.compartment.create({
        data: {
          lockerId: locker.id,
          productId: product.id,
          label: `${product.name.slice(0, 15)}-${i + 1}`,
          active: true,
        },
      })
    )
  })

  const compartments = await Promise.all(compartmentPromises)

  console.log(`✅ Created ${compartments.length} compartments`)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
