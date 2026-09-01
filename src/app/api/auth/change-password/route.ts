import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { getAuthUser } from '@/lib/session'

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const currentPassword = String(body.currentPassword || '')
    const newPassword = String(body.newPassword || '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 })
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 chars' }, { status: 400 })
    }

    // Проверяем текущий пароль
    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const ok = await verifyPassword(currentPassword, dbUser.password)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Меняем пароль
    const newHash = await hashPassword(newPassword)
    await db.user.update({ where: { id: user.id }, data: { password: newHash } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
