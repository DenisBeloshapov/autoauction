import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'
import { sendPushToRole } from '@/lib/push'

// Called once per submission batch (not per lot) — the client already loops
// one POST /api/lots per line, so notifying from inside that route would
// fire one push per lot instead of one per submission.
export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Only clients can trigger this' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const count = Number(body.count) || 0
    if (count <= 0) return NextResponse.json({ error: 'count is required' }, { status: 400 })

    const clientName = user.name || user.username

    await sendPushToRole('ADMIN', {
      title: 'Новая заявка',
      body: `${clientName} — ${count} ${count === 1 ? 'лот' : 'лот(ов)'}`,
      url: '/',
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[notify/new-lots] FATAL:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
