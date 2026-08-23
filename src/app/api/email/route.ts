import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/session'

export async function GET() {
  const batches = await db.emailBatch.findMany({
    orderBy: { sentAt: 'desc' },
    include: {
      lots: {
        include: {
          client: { select: { id: true, username: true, name: true } },
        },
      },
    },
    take: 50,
  })
  return NextResponse.json({ batches })
}

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admin can generate email batches' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const lotIds: string[] = Array.isArray(body.lotIds) ? body.lotIds : []
    const recipientEmail =
      body.recipientEmail ||
      process.env.DEFAULT_EMAIL_RECIPIENT ||
      'auction@company.com'

    if (lotIds.length === 0) {
      return NextResponse.json(
        { error: 'lotIds is required' },
        { status: 400 }
      )
    }

    const lots = await db.lot.findMany({
      where: { id: { in: lotIds } },
      include: {
        client: { select: { id: true, username: true, name: true } },
      },
    })

    if (lots.length === 0) {
      return NextResponse.json(
        { error: 'No lots found for provided ids' },
        { status: 404 }
      )
    }

    const sentDate = new Date().toLocaleDateString('ru-RU')
    const subject = `Лоты от ${sentDate}`

    // Group identical comments: one comment text → list of lot numbers that share it.
    // Output one line per unique comment with all lot numbers it applies to.
    // If only one comment exists across all lots, output just the comment text.
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
        // Single shared comment across multiple lots → just the comment text
        commentsBlock.push(comment)
      } else {
        // Multiple distinct comments → show "Лот #..., #...: comment"
        const nums = lotNumbers.map((n) => `#${n}`).join(', ')
        commentsBlock.push(`Лот ${nums}: ${comment}`)
      }
    })

    const lotsBlock: string[] = lots.map(
      (l, i) =>
        `${i + 1}. Лот #${l.lotNumber} — ${l.rawText || '(нет описания)'}`
    )

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

    const batch = await db.emailBatch.create({
      data: {
        subject,
        recipientEmail,
        body: body_text,
      },
    })

    await db.lot.updateMany({
      where: { id: { in: lotIds } },
      data: { status: 'SENT', emailBatchId: batch.id },
    })

    // Пытаемся отправить через SMTP, если настроен
    let smtpSent = false
    let smtpError: string | undefined
    let actualRecipient = recipientEmail

    try {
      const { sendEmailViaSmtp, getRecipientEmail } = await import('@/lib/email')
      actualRecipient = await getRecipientEmail()
      const smtpResult = await sendEmailViaSmtp(actualRecipient, subject, body_text)
      smtpSent = smtpResult.sent
      smtpError = smtpResult.error
    } catch (smtpErr) {
      // SMTP не настроен или ошибка — не блокируем ответ
      smtpError = smtpErr instanceof Error ? smtpErr.message : 'SMTP error'
    }

    // Emit WebSocket event (не блокируем при ошибке)
    try {
      const { emitRealtime, REALTIME_EVENTS } = await import('@/lib/realtime')
      emitRealtime({ event: REALTIME_EVENTS.EMAIL_SENT, data: { batchId: batch.id, smtpSent } })
    } catch {
      // WS недоступен — игнорируем
    }

    return NextResponse.json({
      success: true,
      emailBatchId: batch.id,
      smtpSent,
      smtpError,
      preview: {
        subject,
        recipientEmail: actualRecipient,
        body: body_text,
        lotCount: lots.length,
      },
    })
  } catch (e) {
    console.error('[email] FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Server error', detail: message },
      { status: 500 }
    )
  }
}
