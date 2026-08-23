import { createHash } from 'crypto'

const SALT = 'auction_salt_2024'

export type Role = 'ADMIN' | 'CLIENT'

export interface TokenPayload {
  userId: string
  role: Role
  timestamp: number
}

/**
 * SHA-256(password + 'auction_salt_2024') → hex
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

/**
 * Base64("userId:role:timestamp")
 */
export function createToken(payload: TokenPayload): string {
  const raw = `${payload.userId}:${payload.role}:${payload.timestamp}`
  return Buffer.from(raw, 'utf-8').toString('base64')
}

/**
 * Decode base64 token → TokenPayload | null
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8')
    const parts = raw.split(':')
    if (parts.length !== 3) return null
    return {
      userId: parts[0],
      role: parts[1] as Role,
      timestamp: parseInt(parts[2], 10),
    }
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: Request): string | null {
  // 1) Authorization: Bearer <token>
  const auth = req.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  // 2) cookie auth_token=...
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)
  if (match) return match[1]
  return null
}
