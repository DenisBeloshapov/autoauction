import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = {}
  if (user.role === 'CLIENT') {
    where.lot = { clientId: user.id }
  }

  const wonLots = await db.wonLot.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lot: {
        include: {
          client: { select: { id: true, username: true, name: true, role: true } },
        },
      },
      deliveryReqs: true,
    },
  })

  return NextResponse.json({ wonLots })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admin can mark lots as won' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()

    // Two formats supported:
    // 1) { winnings: [{ lotNumber, price }, ...] }
    // 2) { text: "12345 Toyota ... 500000\n..." }

    let entries: { lotNumber: string; price: string | number; bodyNumber?: string | null }[] = []

    if (Array.isArray(body.winnings)) {
      entries = body.winnings.map(
        (w: { lotNumber: string; price: string | number; bodyNumber?: string | null }) => ({
          lotNumber: String(w.lotNumber),
          price: w.price,
          bodyNumber: w.bodyNumber ?? null,
        })
      )
    } else if (typeof body.text === 'string') {
      // Parse each line: first number = lotNumber, last number = price
      // Regex matches: "1,500,000" (comma thousands) OR plain "12345"
      // Does NOT consume dots (date separators like 14.04.2026 get split)
      const lines = body.text.split(/\r?\n/).filter((l) => l.trim())
      for (const line of lines) {
        const nums = line.match(/\d{1,3}(?:,\d{3})+|\d+/g) || []
        const clean = nums.map((n) => n.replace(/,/g, '')).filter(Boolean)
        if (clean.length === 0) continue
        const lotNumber = clean[0]
        const price = clean[clean.length - 1]
        entries.push({ lotNumber, price })
      }
    } else {
      return NextResponse.json(
        { error: 'Provide winnings[] or text' },
        { status: 400 }
      )
    }

    const results: {
      lotNumber: string
      price: number | null
      status: 'created' | 'updated' | 'lot_not_found'
    }[] = []
    const newlyWonByClient = new Map<string, string[]>()

    for (const entry of entries) {
      const lot = await db.lot.findFirst({
        where: { lotNumber: entry.lotNumber },
      })
      if (!lot) {
        results.push({
          lotNumber: entry.lotNumber,
          price: null,
          status: 'lot_not_found',
        })
        continue
      }
      const priceNum =
        typeof entry.price === 'string'
          ? parseFloat(entry.price.replace(/[^\d.]/g, ''))
          : entry.price
      const safePrice = isNaN(priceNum as number) ? null : (priceNum as number)

      const existing = await db.wonLot.findUnique({
        where: { lotId: lot.id },
      })
      if (existing) {
        await db.wonLot.update({
          where: { id: existing.id },
          data: {
            price: safePrice ?? undefined,
            ...(entry.bodyNumber ? { bodyNumber: entry.bodyNumber } : {}),
          },
        })
        results.push({
          lotNumber: entry.lotNumber,
          price: safePrice,
          status: 'updated',
        })
      } else {
        await db.wonLot.create({
          data: {
            lotId: lot.id,
            price: safePrice,
            currency: 'JPY',
            status: 'WON',
            bodyNumber: entry.bodyNumber || null,
          },
        })
        await db.lot.update({
          where: { id: lot.id },
          data: { status: 'WON' },
        })
        results.push({
          lotNumber: entry.lotNumber,
          price: safePrice,
          status: 'created',
        })
        if (!newlyWonByClient.has(lot.clientId)) newlyWonByClient.set(lot.clientId, [])
        newlyWonByClient.get(lot.clientId)!.push(entry.lotNumber)
      }
    }

    // Emit WebSocket event
    const { emitRealtime, REALTIME_EVENTS } = await import('@/lib/realtime')
    emitRealtime({ event: REALTIME_EVENTS.WONLOT_CREATED, data: { results } })

    if (newlyWonByClient.size > 0) {
      const { sendPushToUser } = await import('@/lib/push')
      await Promise.all(
        Array.from(newlyWonByClient.entries()).map(([clientId, lotNumbers]) =>
          sendPushToUser(clientId, {
            title: 'Лот выигран',
            body:
              lotNumbers.length === 1
                ? `Лот #${lotNumbers[0]} выигран — проверьте детали`
                : `Выиграно лотов: ${lotNumbers.length} (#${lotNumbers.join(', #')})`,
            url: '/',
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      processed: entries.length,
      results,
    })
  } catch (e) {
    console.error('[won-lots] FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: message }, { status: 500 })
  }
}
