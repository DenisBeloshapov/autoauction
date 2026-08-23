import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export type Role = 'ADMIN' | 'CLIENT'

export interface TokenPayload {
  userId: string
  role: Role
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production-1234567890'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * Hash a password using bcrypt (cost factor 12, per-user salt).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Sign a JWT token containing userId + role, valid for JWT_EXPIRES_IN.
 */
export function createToken(payload: { userId: string; role: Role }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

/**
 * Verify & decode a JWT token. Returns null if invalid/expired.
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    if (!decoded.userId || !decoded.role) return null
    return decoded
  } catch {
    return null
  }
}

/**
 * Extract token from request:
 *   1. Authorization: Bearer <token>
 *   2. Cookie: auth_token=<token>
 */
export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)
  if (match) return match[1]
  return null
}
