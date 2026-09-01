/**
 * Helper для эмит событий в WebSocket mini-service.
 *
 * Mini-service работает на порту 3003.
 * API-роуты Next.js вызывают emitRealtime() чтобы уведомить всех клиентов
 * об изменениях (новый лот, статус изменён, ставки приняты и т.д.).
 *
 * Если mini-service недоступен (например, в serverless-окружении без WebSocket),
 * функция тихо игнорирует ошибку — приложение продолжает работать в режиме
 * polling (клиент сам обновляет данные при действиях).
 */

const REALTIME_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:3003'

interface EmitParams {
  event: string
  data: unknown
}

export async function emitRealtime({ event, data }: EmitParams): Promise<void> {
  try {
    await fetch(`${REALTIME_URL}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    })
  } catch {
    // Mini-service недоступен — игнорируем
  }
}

/**
 * События:
 * - lot:created — создан новый лот
 * - lot:updated — изменён статус лота (отправлен/выигран)
 * - lot:deleted — лот удалён
 * - wonlot:created — принят выигрыш
 * - delivery:created — создан запрос доставки
 * - email:sent — отправлен email
 */
export const REALTIME_EVENTS = {
  LOT_CREATED: 'lot:created',
  LOT_UPDATED: 'lot:updated',
  LOT_DELETED: 'lot:deleted',
  WONLOT_CREATED: 'wonlot:created',
  DELIVERY_CREATED: 'delivery:created',
  EMAIL_SENT: 'email:sent',
} as const
