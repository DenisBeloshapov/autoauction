import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where: Record<string, unknown> = {}
  if (user.role === 'CLIENT') {
    where.clientId = user.id
  }

  const requests = await db.deliveryRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      wonLot: {
        include: {
          lot: {
            include: {
              client: { select: { id: true, username: true, name: true } },
            },
          },
        },
      },
      client: { select: { id: true, username: true, name: true } },
    },
  })

  return NextResponse.json({ requests })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const wonLotIds: string[] = Array.isArray(body.wonLotIds)
      ? body.wonLotIds.map(String)
      : body.wonLotId
        ? [String(body.wonLotId)]
        : []

    if (wonLotIds.length === 0) {
      return NextResponse.json({ error: 'wonLotId or wonLotIds is required' }, { status: 400 })
    }

    const data: { status?: string; bodyNumber?: string | null; vesselName?: string | null; loadingDate?: string | null } = {}

    if (body.status !== undefined) {
      const allowed = ['DELIVERY_REQUESTED', 'DELIVERY_CONFIRMED', 'COMPLETED']
      const status = String(body.status)
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = status
    }

    if (body.bodyNumber !== undefined) {
      data.bodyNumber = body.bodyNumber ? String(body.bodyNumber) : null
    }
    if (body.vesselName !== undefined) {
      data.vesselName = body.vesselName ? String(body.vesselName) : null
    }
    if (body.loadingDate !== undefined) {
      data.loadingDate = body.loadingDate ? String(body.loadingDate) : null
    }

    // bodyNumber edits only ever target one won lot at a time from the UI —
    // guard against accidentally stamping the same value onto a whole batch.
    if (body.bodyNumber !== undefined && wonLotIds.length > 1) {
      return NextResponse.json({ error: 'bodyNumber can only be updated for one lot at a time' }, { status: 400 })
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const wonLots = await Promise.all(
      wonLotIds.map((wonLotId) =>
        db.wonLot.update({
          where: { id: wonLotId },
          data,
          include: { lot: { select: { clientId: true, lotNumber: true } } },
        })
      )
    )

    // Notify each affected client once a contract is confirmed with
    // vessel/loading info — grouped per client, not one push per lot, in
    // case a batch confirm covers several lots for the same client.
    if (data.status === 'DELIVERY_CONFIRMED' && (data.vesselName || data.loadingDate)) {
      const { sendPushToUser } = await import('@/lib/push')
      const byClient = new Map<string, string[]>()
      for (const wl of wonLots) {
        if (!byClient.has(wl.lot.clientId)) byClient.set(wl.lot.clientId, [])
        byClient.get(wl.lot.clientId)!.push(wl.lot.lotNumber)
      }
      const parts: string[] = []
      if (data.vesselName) parts.push(`судно ${data.vesselName}`)
      if (data.loadingDate) parts.push(`погрузка ${data.loadingDate}`)
      await Promise.all(
        Array.from(byClient.entries()).map(([clientId, lotNumbers]) =>
          sendPushToUser(clientId, {
            title: 'На контракте',
            body:
              lotNumbers.length === 1
                ? `Лот #${lotNumbers[0]} — ${parts.join(', ')}`
                : `Лоты #${lotNumbers.join(', #')} — ${parts.join(', ')}`,
            url: '/',
          })
        )
      )
    }

    return NextResponse.json({ wonLots })
  } catch (e) {
    console.error('[delivery] PATCH FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const wonLotId = String(body.wonLotId || '')
    const method = body.method ? String(body.method) : null
    const ownerFullName = body.ownerFullName ? String(body.ownerFullName) : null
    const ownerAddress = body.ownerAddress ? String(body.ownerAddress) : null

    if (!wonLotId) {
      return NextResponse.json(
        { error: 'wonLotId is required' },
        { status: 400 }
      )
    }

    const wonLot = await db.wonLot.findUnique({
      where: { id: wonLotId },
      include: { lot: true },
    })
    if (!wonLot || !wonLot.lot) {
      return NextResponse.json({ error: 'Won lot not found' }, { status: 404 })
    }

    // Clients can only manage their own won lots
    if (user.role === 'CLIENT' && wonLot.lot.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // DUTY requires ownerFullName and ownerAddress
    if (method === 'DUTY') {
      if (!ownerFullName || !ownerAddress) {
        return NextResponse.json(
          { error: 'DUTY method requires ownerFullName and ownerAddress' },
          { status: 400 }
        )
      }
    }

    const clientId = user.role === 'CLIENT' ? user.id : wonLot.lot.clientId

    // Upsert: one active delivery request per wonLot
    const existing = await db.deliveryRequest.findFirst({
      where: { wonLotId },
    })

    let delivery
    if (existing) {
      delivery = await db.deliveryRequest.update({
        where: { id: existing.id },
        data: {
          method,
          ownerFullName,
          ownerAddress,
          status: 'UPDATED',
        },
      })
    } else {
      delivery = await db.deliveryRequest.create({
        data: {
          wonLotId,
          clientId,
          method,
          ownerFullName,
          ownerAddress,
          status: 'PENDING',
        },
      })
    }

    // Update WonLot status
    await db.wonLot.update({
      where: { id: wonLotId },
      data: { status: 'DELIVERY_REQUESTED' },
    })

    return NextResponse.json({ delivery })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
