import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET() {
  const batches = await db.emailBatch.findMany({
    orderBy: { sentAt: 'desc' },
    include: { lots: { include: { client: { select: { id: true, username: true, name: true } } } } },
    take: 50,
  })
  return NextResponse.json({ batches })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admin can generate email batches' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const lotIds: string[] = Array.isArray(body.lotIds) ? body.lotIds : []
    const recipientEmail = body.recipientEmail || process.env.DEFAULT_EMAIL_RECIPIENT || 'auction@company.com'
    if (lotIds.length === 0) return NextResponse.json({ error: 'lotIds is required' }, { status: 400 })

    const lots = await db.lot.findMany({
      where: { id: { in: lotIds } },
      include: { client: { select: { id: true, username: true, name: true } } },
    })
    if (lots.length === 0) return NextResponse.json({ error: 'No lots found' }, { status: 404 })

    const sentDate = new Date().toLocaleDateString('ru-RU')
    const subject = `Лоты от ${sentDate}`

    // Group identical comments: one comment text → list of lot numbers that share it.
    // If only one comment across all lots, output just the comment text.
    const byComment = new Map<string, string[]>()
    lots.forEach((lot) => {
      const c = lot.comment && lot.comment.trim() ? lot.comment.trim() : null
      if (!c) return
      if (!byComment.has(c)) byComment.set(c, [])
      byComment.get(c)!.push(lot.lotNumber)
    })
    const commentsBlock: string[] = []
    byComment.forEach((lotNumbers, comment) => {
      if (byComment.size === 1 && lotNumbers.length > 1) {
        commentsBlock.push(comment)
      } else {
        const nums = lotNumbers.map((n) => `#${n}`).join(', ')
        commentsBlock.push(`Лот ${nums}: ${comment}`)
      }
    })

    const lotsBlock: string[] = lots.map((l, i) => `${i + 1}. Лот #${l.lotNumber} — ${l.rawText || '(нет описания)'}`)

    const body_text = [
      `Тема: ${subject}`,
      `Кому: ${recipientEmail}`,
      '',
      'Комментарий по лотам:',
      commentsBlock.length ? commentsBlock.join('\n') : '(нет комментариев)',
      '',
      'Список лотов:',
      lotsBlock.join('\n'),
      '',
      `Всего лотов: ${lots.length}`,
      `Отправлено: ${new Date().toLocaleString('ru-RU')}`,
    ].join('\n')

    const batch = await db.emailBatch.create({ data: { subject, recipientEmail, body: body_text } })
    await db.lot.updateMany({ where: { id: { in: lotIds } }, data: { status: 'SENT', emailBatchId: batch.id } })

    return NextResponse.json({
      success: true,
      emailBatchId: batch.id,
      preview: { subject, recipientEmail, body: body_text, lotCount: lots.length },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
