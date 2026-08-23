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

interface ParsedEntry {
  lotNumber: string
  price: string
  bodyNumber: string | null
}

/**
 * Парсер строк результатов торгов.
 * Извлекает:
 *   - lotNumber: первое число в строке
 *   - price: последнее число (поддержка точек и запятых как thousand separators)
 *   - bodyNumber: текст МЕЖДУ первым и последним числом (номер кузова / описание)
 *
 * Примеры:
 *   "12345 Toyota Camry white 500000"
 *     → lotNumber=12345, price=500000, bodyNumber="Toyota Camry white"
 *   "2024 14.04.2026 TAA Kyushu / HONDA PRELUDE 2025 230.000"
 *     → lotNumber=2024, price=230000, bodyNumber="14.04.2026 TAA Kyushu / HONDA PRELUDE 2025"
 */
function parseLine(line: string): ParsedEntry | null {
  const nums = line.match(/\d{1,3}(?:[,.]\d{3})+|\d+/g) || []
  if (nums.length === 0) return null

  const firstNum = nums[0]
  const lastNum = nums[nums.length - 1]
  const lotNumber = firstNum.replace(/[,.]/g, '')
  const price = lastNum.replace(/[,.]/g, '')

  // Извлекаем текст между первым и последним числом
  const firstIdx = line.indexOf(firstNum)
  const lastIdx = line.lastIndexOf(lastNum)
  let bodyNumber: string | null = null
  if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx + firstNum.length) {
    bodyNumber = line.substring(firstIdx + firstNum.length, lastIdx).trim()
    if (!bodyNumber) bodyNumber = null
  }

  return { lotNumber, price, bodyNumber }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admin can mark lots as won' }, { status: 403 })
  }
  try {
    const body = await req.json()
    let entries: ParsedEntry[] = []

    if (Array.isArray(body.winnings)) {
      entries = body.winnings.map((w: { lotNumber: string; price: string | number }) => ({
        lotNumber: String(w.lotNumber),
        price: String(w.price),
        bodyNumber: null,
      }))
    } else if (typeof body.text === 'string') {
      const lines = body.text.split(/\r?\n/).filter((l) => l.trim())
      for (const line of lines) {
        const parsed = parseLine(line)
        if (parsed) entries.push(parsed)
      }
    } else {
      return NextResponse.json({ error: 'Provide winnings[] or text' }, { status: 400 })
    }

    const results: {
      lotNumber: string
      price: number | null
      bodyNumber: string | null
      status: 'created' | 'updated' | 'lot_not_found'
    }[] = []

    for (const entry of entries) {
      const lot = await db.lot.findFirst({ where: { lotNumber: entry.lotNumber } })
      if (!lot) {
        results.push({
          lotNumber: entry.lotNumber,
          price: null,
          bodyNumber: entry.bodyNumber,
          status: 'lot_not_found',
        })
        continue
      }
      const priceNum = parseFloat(entry.price.replace(/[^\d.]/g, ''))
      const safePrice = isNaN(priceNum) ? null : priceNum

      const existing = await db.wonLot.findUnique({ where: { lotId: lot.id } })
      if (existing) {
        await db.wonLot.update({
          where: { id: existing.id },
          data: {
            price: safePrice ?? undefined,
            bodyNumber: entry.bodyNumber ?? existing.bodyNumber,
          },
        })
        results.push({
          lotNumber: entry.lotNumber,
          price: safePrice,
          bodyNumber: entry.bodyNumber ?? existing.bodyNumber,
          status: 'updated',
        })
      } else {
        await db.wonLot.create({
          data: {
            lotId: lot.id,
            price: safePrice,
            currency: 'JPY',
            bodyNumber: entry.bodyNumber,
            status: 'WON',
          },
        })
        await db.lot.update({ where: { id: lot.id }, data: { status: 'WON' } })
        results.push({
          lotNumber: entry.lotNumber,
          price: safePrice,
          bodyNumber: entry.bodyNumber,
          status: 'created',
        })
      }
    }

    return NextResponse.json({ success: true, processed: entries.length, results })
  } catch (err) {
    console.error('[won-lots] FATAL:', err)
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json(
      { error: 'Server error', detail: message, stack: stack?.split('\n').slice(0, 5).join('\n') },
      { status: 500 }
    )
  }
}
