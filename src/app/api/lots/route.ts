import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const clientId = url.searchParams.get('clientId') || undefined

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (clientId) where.clientId = clientId
  if (user.role === 'CLIENT') where.clientId = user.id

  const lots = await db.lot.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, username: true, name: true, role: true } },
      wonLot: true,
      emailBatch: { select: { id: true, subject: true, sentAt: true } },
    },
  })
  return NextResponse.json({ lots })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Only clients can create lots' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const lotText = String(body.lotText || '')
    const comment = body.comment ? String(body.comment) : null
    if (!lotText.trim()) {
      return NextResponse.json({ error: 'lotText is required' }, { status: 400 })
    }
    const match = lotText.match(/\d{1,3}(?:[,.]\d{3})+|\d+/)
    if (!match) {
      return NextResponse.json({ error: 'Could not extract lot number from text' }, { status: 400 })
    }
    const lotNumber = match[0].replace(/[,.]/g, '')
    // Отрезаем номер лота из rawText, чтобы он не дублировался в отображении
    const { stripLotNumber } = await import('@/lib/utils')
    const cleanRawText = stripLotNumber(lotText)
    const lot = await db.lot.create({
      data: { lotNumber, rawText: cleanRawText || lotText, comment, clientId: user.id, status: 'PENDING' },
      include: { client: { select: { id: true, username: true, name: true, role: true } } },
    })
    return NextResponse.json(lot, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admin can bulk update lots' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const lotIds: string[] = Array.isArray(body.lotIds) ? body.lotIds : []
    const status = String(body.status || '')
    const emailBatchId = body.emailBatchId ? String(body.emailBatchId) : undefined
    if (lotIds.length === 0 || !status) {
      return NextResponse.json({ error: 'lotIds and status are required' }, { status: 400 })
    }
    const updated = await db.lot.updateMany({
      where: { id: { in: lotIds } },
      data: { status, ...(emailBatchId ? { emailBatchId } : {}) },
    })
    return NextResponse.json({ updated: updated.count, message: `${updated.count} lots updated successfully` })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(req.url)
    const lotId = url.searchParams.get('id')
    if (!lotId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const lot = await db.lot.findUnique({ where: { id: lotId } })
    if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 })

    if (user.role === 'CLIENT' && lot.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Clean up related rows so deletion always succeeds regardless of status.
    if (lot.wonLotId) {
      // wonLotId is NOT a column on Lot in our schema — WonLot has lotId FK to Lot.
      // We find the WonLot via lotId, delete its delivery requests, then the WonLot.
    }
    // Find & delete WonLot + DeliveryRequests linked to this lot
    const wonLot = await db.wonLot.findFirst({ where: { lotId } })
    if (wonLot) {
      await db.deliveryRequest.deleteMany({ where: { wonLotId: wonLot.id } })
      await db.wonLot.delete({ where: { id: wonLot.id } })
    }
    // Detach from EmailBatch (nullable FK) — keeps the batch record intact
    if (lot.emailBatchId) {
      await db.lot.update({ where: { id: lotId }, data: { emailBatchId: null } })
    }
    await db.lot.delete({ where: { id: lotId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
