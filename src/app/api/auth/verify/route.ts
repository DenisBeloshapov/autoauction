import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
