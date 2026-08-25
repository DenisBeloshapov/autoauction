import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findFirst({
      where: { username, isActive: true },
    })
    if (!user || user.password !== hashPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = createToken({
      userId: user.id,
      role: user.role as 'ADMIN' | 'CLIENT',
      timestamp: Date.now(),
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
