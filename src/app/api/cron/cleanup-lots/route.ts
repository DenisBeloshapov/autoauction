import { NextResponse } from 'next/server'
import { cleanupStaleLots } from '@/lib/cleanup'

// Called by Vercel Cron (see vercel.json). Vercel automatically sends a
// Bearer token equal to CRON_SECRET when that env var is set — we verify it
// so this endpoint can't be triggered by anyone else who finds the URL.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const deleted = await cleanupStaleLots()
    return NextResponse.json({ deleted })
  } catch (e) {
    console.error('[cron/cleanup-lots] FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: message }, { status: 500 })
  }
}
