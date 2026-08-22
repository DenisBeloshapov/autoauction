/**
 * Seed script — creates admin + testclient users.
 *
 * Local dev:
 *   npm run db:seed
 *
 * Production (Vercel + Neon):
 *   npx tsx scripts/seed-admin.ts
 *   (run from your local machine with DATABASE_URL pointing to prod DB)
 *
 * Passwords are hashed with bcrypt (cost factor 12) — never stored in plain text.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  await db.deliveryRequest.deleteMany()
  await db.wonLot.deleteMany()
  await db.emailBatch.deleteMany()
  await db.lot.deleteMany()
  await db.user.deleteMany()

  const admin = await db.user.create({
    data: {
      username: 'admin',
      password: await bcrypt.hash('admin123', 12),
      name: 'Administrator',
      role: 'ADMIN',
    },
  })

  const client = await db.user.create({
    data: {
      username: 'testclient',
      password: await bcrypt.hash('client123', 12),
      name: 'Test Client',
      role: 'CLIENT',
    },
  })

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
