import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { lots: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const name = body.name ? String(body.name).trim() : null
    const role = body.role === 'ADMIN' ? 'ADMIN' : 'CLIENT'
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 chars' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    const newUser = await db.user.create({
      data: { username, password: await hashPassword(password), name, role },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(newUser, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
