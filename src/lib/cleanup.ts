import { db } from './db'

const RETENTION_DAYS = 7
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000 // don't re-run more than once per 12h via the lazy trigger

/**
 * Deletes lots that never won within RETENTION_DAYS of being created.
 * Never touches WON lots — a won lot always keeps its status 'WON' from the
 * moment an admin accepts the bid (see /api/won-lots), so this only ever
 * removes PENDING/SENT lots that the auction result never confirmed.
 */
export async function cleanupStaleLots(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const result = await db.lot.deleteMany({
    where: {
      status: { not: 'WON' },
      createdAt: { lt: cutoff },
    },
  })
  return result.count
}

/**
 * Best-effort lazy trigger — safe to call from any frequently-hit read path
 * (e.g. GET /api/lots). Runs cleanup at most once per MIN_INTERVAL_MS, tracked
 * via the Setting table, so normal traffic doesn't hammer the DB with deletes
 * on every request. This is a fallback in case the Vercel Cron job (see
 * vercel.json + /api/cron/cleanup-lots) isn't configured — cheap insurance,
 * not the primary mechanism.
 */
export async function maybeCleanupStaleLots(): Promise<void> {
  try {
    const key = 'lastLotCleanupAt'
    const setting = await db.setting.findUnique({ where: { key } })
    const last = setting?.value ? new Date(setting.value).getTime() : 0
    if (Date.now() - last < MIN_INTERVAL_MS) return

    // Claim the run immediately (before the delete finishes) to avoid two
    // concurrent requests both kicking off cleanup at the same time.
    await db.setting.upsert({
      where: { key },
      update: { value: new Date().toISOString() },
      create: { key, value: new Date().toISOString() },
    })

    await cleanupStaleLots()
  } catch (e) {
    // Never let cleanup break the actual request it piggybacks on.
    console.error('[cleanup] lazy trigger failed:', e)
  }
}
