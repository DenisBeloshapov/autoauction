import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { getAuthUser } from '@/lib/session'

export async function POST(req: Request) {
  const admin = await getAuthUser(req)
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const name = body.name ? String(body.name).trim() : null
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 chars' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    const user = await db.user.create({
      data: { username, password: await hashPassword(password), name, role: 'CLIENT' },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
