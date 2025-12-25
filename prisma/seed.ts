import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ownerEmail = 'owner@rentbox.ee'
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'Owner',
      role: Role.OWNER,
    },
  })
  console.log({ owner })

  const category = await prisma.category.upsert({
      where: { slug: 'tools' },
      update: {},
      create: {
          name: 'Tools',
          slug: 'tools',
          description: 'Power tools for rent',
          order: 1
      }
  })
  console.log({ category })
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
