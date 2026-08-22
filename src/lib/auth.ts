import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export type Role = 'ADMIN' | 'CLIENT'

export interface JwtPayload {
  userId: string
  role: Role
  // issued-at (seconds)
  iat?: number
  // expiry (seconds)
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * Hash a password using bcrypt with a per-user salt (cost factor 12).
 * Replaces the old static-salt SHA-256 scheme.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Verify a password against a bcrypt hash.
 * Constant-time comparison — safe against timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Sign a JWT token containing userId + role, valid for JWT_EXPIRES_IN.
 * Replaces the old unsigned base64 token.
 */
export function createToken(payload: { userId: string; role: Role }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

/**
 * Verify & decode a JWT token. Returns null if invalid/expired.
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
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
