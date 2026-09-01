import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  // Clean slate
  await db.deliveryRequest.deleteMany()
  await db.wonLot.deleteMany()
  await db.emailBatch.deleteMany()
  await db.lot.deleteMany()
  await db.user.deleteMany()

  const admin = await db.user.create({
    data: {
      username: 'admin',
      password: await hashPassword('admin123'),
      name: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  })

  const client = await db.user.create({
    data: {
      username: 'testclient',
      password: await hashPassword('client123'),
      name: 'Test Client',
      role: 'CLIENT',
      isActive: true,
    },
  })

  // Sample lots for the test client
  await db.lot.createMany({
    data: [
      {
        lotNumber: '12345',
        rawText: '12345 Toyota Camry 2023 White',
        auctionName: 'USS Tokyo',
        carMake: 'Toyota',
        carModel: 'Camry',
        auctionDate: '2026-08-25',
        comment: 'Хочу этот',
        clientId: client.id,
        status: 'PENDING',
      },
      {
        lotNumber: '67890',
        rawText: '67890 Honda Civic 2022 Black',
        auctionName: 'TAA Yokohama',
        carMake: 'Honda',
        carModel: 'Civic',
        auctionDate: '2026-08-26',
        clientId: client.id,
        status: 'PENDING',
      },
    ],
  })

  console.log('✓ Seed complete')
  console.log('  Admin:    admin / admin123      (id=' + admin.id + ')')
  console.log('  Client:   testclient / client123 (id=' + client.id + ')')
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
