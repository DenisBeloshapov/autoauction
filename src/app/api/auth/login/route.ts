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

    console.log('[login] Attempt:', { username, hasPassword: !!password })

    const user = await db.user.findFirst({ where: { username, isActive: true } })
    console.log('[login] User found:', user ? { id: user.id, username: user.username, role: user.role, passwordPrefix: user.password.substring(0, 7) } : 'NOT FOUND')

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('[login] Verifying password with bcrypt...')
    const passwordOk = await verifyPassword(password, user.password)
    console.log('[login] Password verify result:', passwordOk)

    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('[login] Creating JWT token...')
    const token = createToken({ userId: user.id, role: user.role as 'ADMIN' | 'CLIENT' })
    console.log('[login] Token created, length:', token.length)

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email },
    })
  } catch (err) {
    // Полный stack trace попадёт в Vercel Logs
    console.error('[login] FATAL ERROR:', err)
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const name = err instanceof Error ? err.constructor.name : 'Unknown'
    return NextResponse.json(
      {
        error: 'Server error',
        detail: message,
        errorName: name,
        stack: stack?.split('\n').slice(0, 5).join('\n'),
      },
      { status: 500 }
    )
  }
}
