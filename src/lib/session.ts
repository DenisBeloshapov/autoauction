import { db } from './db'
import { decodeToken, getTokenFromRequest, type Role } from './auth'

export interface AuthUser {
  id: string
  username: string
  name: string | null
  role: Role
  email: string | null
}

/**
 * Get the authenticated user from the request.
 * Validates the JWT, fetches the user from DB, ensures they're still active.
 */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(req)
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) return null
  const user = await db.user.findFirst({
    where: { id: payload.userId, isActive: true },
    select: { id: true, username: true, name: true, role: true, email: true },
  })
  if (!user) return null
  return user as AuthUser
}

export function requireRole(user: AuthUser | null, role: Role): boolean {
  return !!user && user.role === role
}
