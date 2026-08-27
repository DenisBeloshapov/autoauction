import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'
import { maybeCleanupStaleLots } from '@/lib/cleanup'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fallback cleanup trigger (rate-limited internally) — fire-and-forget,
  // never blocks this request or lets a cleanup failure affect the response.
  void maybeCleanupStaleLots()

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const clientId = url.searchParams.get('clientId') || undefined

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (clientId) where.clientId = clientId

  // Clients see only their own lots
  if (user.role === 'CLIENT') {
    where.clientId = user.id
  }

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
    return NextResponse.json(
      { error: 'Only clients can create lots' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const lotText = String(body.lotText || '')
    const comment = body.comment ? String(body.comment) : null

    if (!lotText.trim()) {
      return NextResponse.json(
        { error: 'lotText is required' },
        { status: 400 }
      )
    }

    // Extract first number as lot number
    const match = lotText.match(/(\d+)/)
    if (!match) {
      return NextResponse.json(
        { error: 'Could not extract lot number from text' },
        { status: 400 }
      )
    }
    const lotNumber = match[1]

    const lot = await db.lot.create({
      data: {
        lotNumber,
        rawText: lotText,
        comment,
        clientId: user.id,
        status: 'PENDING',
      },
      include: {
        client: { select: { id: true, username: true, name: true, role: true } },
      },
    })

    // Emit WebSocket event
    const { emitRealtime, REALTIME_EVENTS } = await import('@/lib/realtime')
    emitRealtime({ event: REALTIME_EVENTS.LOT_CREATED, data: { lotId: lot.id, clientId: user.id } })

    return NextResponse.json(lot, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admin can bulk update lots' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const lotIds: string[] = Array.isArray(body.lotIds) ? body.lotIds : []
    const status = String(body.status || '')
    const emailBatchId = body.emailBatchId ? String(body.emailBatchId) : undefined

    if (lotIds.length === 0 || !status) {
      return NextResponse.json(
        { error: 'lotIds and status are required' },
        { status: 400 }
      )
    }

    const updated = await db.lot.updateMany({
      where: { id: { in: lotIds } },
      data: {
        status,
        ...(emailBatchId ? { emailBatchId } : {}),
      },
    })

    // Emit WebSocket event
    const { emitRealtime, REALTIME_EVENTS } = await import('@/lib/realtime')
    emitRealtime({ event: REALTIME_EVENTS.LOT_UPDATED, data: { lotIds, status } })

    return NextResponse.json({
      updated: updated.count,
      message: `${updated.count} lots updated successfully`,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const lotId = url.searchParams.get('id')
    if (!lotId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const lot = await db.lot.findUnique({ where: { id: lotId } })
    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }

    // Clients can delete only their own lots
    if (user.role === 'CLIENT' && lot.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can delete any lot (regardless of status). WonLot and
    // DeliveryRequest both cascade-delete at the DB level (onDelete: Cascade
    // in schema.prisma), so no manual pre-cleanup of those is needed.
    // Detach from EmailBatch (set FK to null) — keeps the batch record intact
    if (lot.emailBatchId) {
      await db.lot.update({ where: { id: lotId }, data: { emailBatchId: null } })
    }

    await db.lot.delete({ where: { id: lotId } })

    // Emit WebSocket event
    const { emitRealtime, REALTIME_EVENTS } = await import('@/lib/realtime')
    emitRealtime({ event: REALTIME_EVENTS.LOT_DELETED, data: { lotId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
