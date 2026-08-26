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

async function getTemplateSettings() {
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: ['emailSubjectTemplate', 'emailIntroTemplate'] } },
    })
    const subjectTemplate = rows.find((r) => r.key === 'emailSubjectTemplate')?.value || 'Лоты от {date}'
    const introTemplate = rows.find((r) => r.key === 'emailIntroTemplate')?.value || ''
    return { subjectTemplate, introTemplate }
  } catch {
    return { subjectTemplate: 'Лоты от {date}', introTemplate: '' }
  }
}

async function composeEmail(lotIds: string[], recipientEmailInput?: string) {
  const recipientEmail =
    recipientEmailInput ||
    process.env.DEFAULT_EMAIL_RECIPIENT ||
    'auction@company.com'

  const lots = await db.lot.findMany({
    where: { id: { in: lotIds } },
    include: {
      client: { select: { id: true, username: true, name: true } },
    },
  })

  if (lots.length === 0) return null

  const { subjectTemplate, introTemplate } = await getTemplateSettings()
  const sentDate = new Date().toLocaleDateString('ru-RU')
  const subject = subjectTemplate.replace(/\{date\}/g, sentDate)

  // Group identical comments: one comment text → list of lot numbers that share it.
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

  const lotsBlock: string[] = lots.map(
    (l, i) => `${i + 1}. Лот #${l.lotNumber} — ${l.rawText || '(нет описания)'}`
  )

  const bodyLines = [
    `Тема: ${subject}`,
    `Кому: ${recipientEmail}`,
    '',
  ]
  if (introTemplate.trim()) {
    bodyLines.push(introTemplate.trim(), '')
  }
  bodyLines.push(
    'Комментарий по лотам:',
    commentsBlock.length ? commentsBlock.join('\n') : '(нет комментариев)',
    '',
    'Список лотов:',
    lotsBlock.join('\n'),
    '',
    `Всего лотов: ${lots.length}`,
    `Отправлено: ${new Date().toLocaleString('ru-RU')}`,
  )

  return { subject, recipientEmail, body: bodyLines.join('\n'), lotCount: lots.length }
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
    const mode: 'preview' | 'send' = body.mode === 'send' ? 'send' : 'preview'

    if (lotIds.length === 0) {
      return NextResponse.json({ error: 'lotIds is required' }, { status: 400 })
    }

    const composed = await composeEmail(lotIds, body.recipientEmail)
    if (!composed) {
      return NextResponse.json({ error: 'No lots found for provided ids' }, { status: 404 })
    }

    // Preview mode: compose only, zero side effects — nothing is saved, nothing is sent,
    // nothing is marked SENT. Lets the admin see exactly what will go out before committing.
    if (mode === 'preview') {
      return NextResponse.json({ preview: composed })
    }

    // Send mode: commit — create the batch, mark lots SENT, attempt SMTP.
    const batch = await db.emailBatch.create({
      data: {
        subject: composed.subject,
        recipientEmail: composed.recipientEmail,
        body: composed.body,
      },
    })

    await db.lot.updateMany({
      where: { id: { in: lotIds } },
      data: { status: 'SENT', emailBatchId: batch.id },
    })

    let smtpSent = false
    let smtpError: string | undefined
    let actualRecipient = composed.recipientEmail

    try {
      const { sendEmailViaSmtp, getRecipientEmail } = await import('@/lib/email')
      actualRecipient = await getRecipientEmail()
      const smtpResult = await sendEmailViaSmtp(actualRecipient, composed.subject, composed.body)
      smtpSent = smtpResult.sent
      smtpError = smtpResult.error
    } catch (smtpErr) {
      smtpError = smtpErr instanceof Error ? smtpErr.message : 'SMTP error'
    }

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
      preview: { ...composed, recipientEmail: actualRecipient },
    })
  } catch (e) {
    console.error('[email] FATAL:', e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: message }, { status: 500 })
  }
}
