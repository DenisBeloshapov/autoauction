import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where: Record<string, unknown> = {}
  if (user.role === 'CLIENT') where.clientId = user.id
  const requests = await db.deliveryRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      wonLot: { include: { lot: { include: { client: { select: { id: true, username: true, name: true } } } } } },
      client: { select: { id: true, username: true, name: true } },
    },
  })
  return NextResponse.json({ requests })
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
    if (!wonLotId) return NextResponse.json({ error: 'wonLotId is required' }, { status: 400 })

    const wonLot = await db.wonLot.findUnique({ where: { id: wonLotId }, include: { lot: true } })
    if (!wonLot || !wonLot.lot) return NextResponse.json({ error: 'Won lot not found' }, { status: 404 })

    if (user.role === 'CLIENT' && wonLot.lot.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (method === 'DUTY') {
      if (!ownerFullName || !ownerAddress) {
        return NextResponse.json({ error: 'DUTY method requires ownerFullName and ownerAddress' }, { status: 400 })
      }
    }

    const clientId = user.role === 'CLIENT' ? user.id : wonLot.lot.clientId
    const existing = await db.deliveryRequest.findFirst({ where: { wonLotId } })
    let delivery
    if (existing) {
      delivery = await db.deliveryRequest.update({
        where: { id: existing.id },
        data: { method, ownerFullName, ownerAddress, status: 'UPDATED' },
      })
    } else {
      delivery = await db.deliveryRequest.create({
        data: { wonLotId, clientId, method, ownerFullName, ownerAddress, status: 'PENDING' },
      })
    }
    await db.wonLot.update({ where: { id: wonLotId }, data: { status: 'DELIVERY_REQUESTED' } })
    return NextResponse.json({ delivery })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
