import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

const SETTING_KEYS = [
  'emailRecipient',
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPassword',
  'smtpFrom',
] as const

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Проверяем, что db.setting существует (Prisma client сгенерирован с моделью Setting)
    if (!db.setting) {
      console.error('[settings] db.setting is undefined — Prisma client not generated with Setting model')
      return NextResponse.json(
        {
          error: 'Setting model not found in Prisma client',
          detail: 'Run: npx prisma generate (locally) or check that schema.prisma contains model Setting',
          dbKeys: Object.keys(db).filter(k => !k.startsWith('_')).slice(0, 20),
        },
        { status: 500 }
      )
    }

    const settings = await db.setting.findMany({
      where: { key: { in: SETTING_KEYS as readonly string[] } },
    })

    const result: Record<string, string | null> = {}
    for (const key of SETTING_KEYS) {
      const s = settings.find((s) => s.key === key)
      result[key] = s?.value || null
    }

    result.smtpPasswordConfigured = !!result.smtpPassword
    delete result.smtpPassword

    return NextResponse.json({ settings: result })
  } catch (err) {
    console.error('[settings] FATAL:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Server error', detail: message },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (!db.setting) {
      return NextResponse.json(
        { error: 'Setting model not found in Prisma client' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const updates: { key: string; value: string }[] = []

    for (const key of SETTING_KEYS) {
      if (key in body) {
        const val = body[key]
        if (typeof val === 'string' && val.trim()) {
          updates.push({ key, value: val.trim() })
        } else if (val === '' || val === null) {
          updates.push({ key, value: '' })
        }
      }
    }

    for (const { key, value } of updates) {
      const existing = await db.setting.findUnique({ where: { key } })
      if (existing) {
        await db.setting.update({ where: { id: existing.id }, data: { value } })
      } else {
        await db.setting.create({ data: { key, value } })
      }
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (err) {
    console.error('[settings PUT] FATAL:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Server error', detail: message },
      { status: 500 }
    )
  }
}
