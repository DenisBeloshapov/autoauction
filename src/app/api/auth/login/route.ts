import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

export async function POST(req: Request) {
  // Rate limit: 10 attempts per minute per IP
  const ip = getClientIp(req)
  const limit = await checkRateLimit(`login:${ip}`)
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Слишком много попыток входа. Попробуйте через минуту.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((limit.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }
    const user = await db.user.findFirst({ where: { username, isActive: true } })
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const token = createToken({ userId: user.id, role: user.role as 'ADMIN' | 'CLIENT' })
    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
