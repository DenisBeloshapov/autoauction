import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'
import { sendPushToUser, isPushConfigured } from '@/lib/push'

// Self-test: sends a push to the CURRENT user only, and returns exactly
// what happened at each step — used right after subscribing so the person
// gets immediate, specific feedback instead of a silent "maybe it works".
export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isPushConfigured()) {
    return NextResponse.json({
      ok: false,
      reason: 'not_configured',
      message: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY не заданы на сервере',
    })
  }

  const subCount = await db.pushSubscription.count({ where: { userId: user.id } })
  if (subCount === 0) {
    return NextResponse.json({
      ok: false,
      reason: 'no_subscription',
      message: 'Подписка не найдена на сервере',
    })
  }

  try {
    await sendPushToUser(user.id, {
      title: 'Тестовое уведомление',
      body: 'Если вы это видите — уведомления работают.',
      url: '/',
    })
    return NextResponse.json({ ok: true, subCount })
  } catch (e) {
    console.error('[push/test] FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, reason: 'send_failed', message })
  }
}
