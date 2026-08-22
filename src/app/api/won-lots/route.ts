import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = {}
  if (user.role === 'CLIENT') where.lot = { clientId: user.id }

  const wonLots = await db.wonLot.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lot: { include: { client: { select: { id: true, username: true, name: true, role: true } } } },
      deliveryReqs: true,
    },
  })
  return NextResponse.json({ wonLots })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admin can mark lots as won' }, { status: 403 })
  }
  try {
    const body = await req.json()
    let entries: { lotNumber: string; price: string | number }[] = []

    if (Array.isArray(body.winnings)) {
      entries = body.winnings.map((w: { lotNumber: string; price: string | number }) => ({
        lotNumber: String(w.lotNumber),
        price: w.price,
      }))
    } else if (typeof body.text === 'string') {
      const lines = body.text.split(/\r?\n/).filter((l) => l.trim())
      for (const line of lines) {
        // NEW PARSER: handles dots and commas as thousand separators.
        // "230.000" and "230,000" both → 230000.
        // Date "14.04.2026" → split into separate numbers (14, 04, 2026).
        // "1,500,000" → 1500000 (single number).
        const nums = line.match(/\d{1,3}(?:[,.]\d{3})+|\d+/g) || []
        const clean = nums.map((n) => n.replace(/[,.]/g, '')).filter(Boolean)
        if (clean.length === 0) continue
        entries.push({ lotNumber: clean[0], price: clean[clean.length - 1] })
      }
    } else {
      return NextResponse.json({ error: 'Provide winnings[] or text' }, { status: 400 })
    }

    const results: { lotNumber: string; price: number | null; status: 'created' | 'updated' | 'lot_not_found' }[] = []

    for (const entry of entries) {
      const lot = await db.lot.findFirst({ where: { lotNumber: entry.lotNumber } })
      if (!lot) {
        results.push({ lotNumber: entry.lotNumber, price: null, status: 'lot_not_found' })
        continue
      }
      const priceNum = typeof entry.price === 'string' ? parseFloat(entry.price.replace(/[^\d.]/g, '')) : entry.price
      const safePrice = isNaN(priceNum as number) ? null : (priceNum as number)

      const existing = await db.wonLot.findUnique({ where: { lotId: lot.id } })
      if (existing) {
        await db.wonLot.update({ where: { id: existing.id }, data: { price: safePrice ?? undefined } })
        results.push({ lotNumber: entry.lotNumber, price: safePrice, status: 'updated' })
      } else {
        await db.wonLot.create({ data: { lotId: lot.id, price: safePrice, currency: 'JPY', status: 'WON' } })
        await db.lot.update({ where: { id: lot.id }, data: { status: 'WON' } })
        results.push({ lotNumber: entry.lotNumber, price: safePrice, status: 'created' })
      }
    }

    return NextResponse.json({ success: true, processed: entries.length, results })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
