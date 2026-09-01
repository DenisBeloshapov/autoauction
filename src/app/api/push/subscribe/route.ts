import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const endpoint = String(body.endpoint || '')
    const p256dh = String(body.keys?.p256dh || '')
    const auth = String(body.keys?.auth || '')
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth },
      create: { userId: user.id, endpoint, p256dh, auth },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[push/subscribe] FATAL:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
