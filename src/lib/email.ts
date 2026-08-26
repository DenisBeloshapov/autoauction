import { db } from './db'

interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  from: string
}

/**
 * Читает SMTP-настройки из таблицы Setting.
 * Возвращает null, если SMTP не настроен или таблица Setting недоступна.
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    if (!db.setting) return null

    const keys = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'smtpFrom']
    const settings = await db.setting.findMany({ where: { key: { in: keys } } })

    const get = (key: string): string | null => {
      const s = settings.find((s) => s.key === key)
      return s?.value || null
    }

    const host = get('smtpHost')
    const port = get('smtpPort')
    const user = get('smtpUser')
    const password = get('smtpPassword')
    const from = get('smtpFrom')

    if (!host || !user || !password) return null

    return {
      host,
      port: parseInt(port || '587', 10),
      user,
      password,
      from: from || user,
    }
  } catch {
    return null
  }
}

/**
 * Отправляет email через SMTP, если настроен.
 * Возвращает { sent: boolean, error?: string }.
 */
export async function sendEmailViaSmtp(
  to: string,
  subject: string,
  text: string
): Promise<{ sent: boolean; error?: string }> {
  const config = await getSmtpConfig()
  if (!config) {
    return { sent: false, error: 'SMTP not configured' }
  }

  try {
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
    })

    return { sent: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { sent: false, error: message }
  }
}

/**
 * Читает email получателя из таблицы Setting.
 * Fallback на env DEFAULT_EMAIL_RECIPIENT.
 * Не падает если таблица Setting недоступна.
 */
export async function getRecipientEmail(): Promise<string> {
  try {
    if (!db.setting) {
      return process.env.DEFAULT_EMAIL_RECIPIENT || 'auction@company.com'
    }
    const s = await db.setting.findUnique({ where: { key: 'emailRecipient' } })
    return s?.value || process.env.DEFAULT_EMAIL_RECIPIENT || 'auction@company.com'
  } catch {
    return process.env.DEFAULT_EMAIL_RECIPIENT || 'auction@company.com'
  }
}
