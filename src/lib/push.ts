import webpush from 'web-push'
import { db } from './db'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

let configured = false
function ensureConfigured() {
  if (configured) return true
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
  return true
}

interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Sends a push notification to every subscribed device for one user. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return
  const subs = await db.pushSubscription.findMany({ where: { userId } })
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        // 404/410 = the browser dropped this subscription — stop trying it
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error('[push] send failed:', err)
        }
      }
    })
  )
}

/** Sends a push notification to every active user with the given role. */
export async function sendPushToRole(role: 'ADMIN' | 'CLIENT', payload: PushPayload) {
  const users = await db.user.findMany({ where: { role, isActive: true }, select: { id: true } })
  await Promise.all(users.map((u) => sendPushToUser(u.id, payload)))
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC
}

export function isPushConfigured() {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE)
}
