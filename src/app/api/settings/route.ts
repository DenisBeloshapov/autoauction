import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

// Все ключи настроек, которые мы используем
const SETTING_KEYS = [
  'emailRecipient',    // Куда отправлять список лотов
  'smtpHost',          // SMTP сервер (например smtp.gmail.com)
  'smtpPort',          // SMTP порт (465, 587)
  'smtpUser',          // Логин SMTP (email отправителя)
  'smtpPassword',      // Пароль SMTP
  'smtpFrom',          // От кого отправлять (имя + email)
] as const

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await db.setting.findMany({
    where: { key: { in: SETTING_KEYS as readonly string[] } },
  })

  const result: Record<string, string | null> = {}
  for (const key of SETTING_KEYS) {
    const s = settings.find((s) => s.key === key)
    result[key] = s?.value || null
  }

  // smtpPassword возвращаем как boolean (настроен/нет), не сам пароль
  result.smtpPasswordConfigured = !!result.smtpPassword
  delete result.smtpPassword

  return NextResponse.json({ settings: result })
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const updates: { key: string; value: string }[] = []

    for (const key of SETTING_KEYS) {
      if (key in body) {
        const val = body[key]
        if (typeof val === 'string' && val.trim()) {
          updates.push({ key, value: val.trim() })
        } else if (val === '' || val === null) {
          // Очищаем настройку
          updates.push({ key, value: '' })
        }
      }
    }

    // upsert каждого изменённого ключа
    for (const { key, value } of updates) {
      const existing = await db.setting.findUnique({ where: { key } })
      if (existing) {
        await db.setting.update({ where: { id: existing.id }, data: { value } })
      } else {
        await db.setting.create({ data: { key, value } })
      }
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
