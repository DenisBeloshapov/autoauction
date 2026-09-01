import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const endpoint = String(body.endpoint || '')
    if (!endpoint) return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })

    // Only delete if it actually belongs to this user
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[push/unsubscribe] FATAL:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
