import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createToken, decodeToken } from '@/lib/auth'

/**
 * Debug endpoint — показывает состояние окружения, БД, и тестовый логин.
 *
 * ВНИМАНИЕ: этот endpoint раскрывает чувствительную информацию (число пользователей,
 * формат хешей и т.п.). Используйте ТОЛЬКО для диагностики на проде.
 * После исправления проблемы — удалите этот файл или закомментируйте export.
 *
 * GET /api/debug
 */
export async function GET() {
  const checks: Record<string, unknown> = {}

  // 1. Проверка env-переменных (без раскрытия значений)
  checks.environment = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_starts_with_postgres: process.env.DATABASE_URL?.startsWith('postgresql') ?? false,
    JWT_SECRET_set: !!process.env.JWT_SECRET,
    JWT_SECRET_length: process.env.JWT_SECRET?.length ?? 0,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '(not set)',
    DEFAULT_EMAIL_RECIPIENT: process.env.DEFAULT_EMAIL_RECIPIENT ?? '(not set)',
    UPSTASH_REDIS_REST_URL_set: !!process.env.UPSTASH_REDIS_REST_URL,
    NODE_ENV: process.env.NODE_ENV ?? '(not set)',
  }

  // 2. Проверка подключения к БД и таблиц
  try {
    const userCount = await db.user.count()
    checks.database = {
      status: 'connected',
      userCount,
    }

    if (userCount > 0) {
      const users = await db.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          password: true,
        },
      })
      checks.users = users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordLength: u.password.length,
        passwordStartsWithBcrypt: u.password.startsWith('$2'),
        passwordPrefix: u.password.substring(0, 7),
      }))
    } else {
      checks.users = 'NO USERS IN DATABASE — need to run: npm run db:seed'
    }

    // Проверим admin
    const admin = await db.user.findFirst({ where: { username: 'admin' } })
    if (admin) {
      checks.adminCheck = {
        found: true,
        passwordStartsWithBcrypt: admin.password.startsWith('$2'),
        passwordLength: admin.password.length,
        expectedBcryptLength: 60,
        expectedSha256Length: 64,
        note:
          admin.password.startsWith('$2')
            ? '✓ bcrypt format — looks correct'
            : '✗ NOT bcrypt format — looks like SHA-256 (legacy). Need to re-seed DB.',
      }
    } else {
      checks.adminCheck = 'admin user NOT FOUND in database'
    }
  } catch (e) {
    checks.database = {
      status: 'ERROR',
      error: e instanceof Error ? e.message : String(e),
      errorName: e instanceof Error ? e.constructor.name : 'Unknown',
    }
    return NextResponse.json(checks, { status: 500 })
  }

  // 3. Тест bcrypt verify
  try {
    const admin = await db.user.findFirst({ where: { username: 'admin' } })
    if (admin) {
      const passwordOk = await verifyPassword('admin123', admin.password)
      checks.bcryptVerify = {
        passwordIs_admin123: passwordOk,
        note: passwordOk
          ? '✓ bcrypt verify works — login should work'
          : '✗ bcrypt verify FAILED — password in DB does not match "admin123". Need to re-seed.',
      }
    }
  } catch (e) {
    checks.bcryptVerify = {
      error: e instanceof Error ? e.message : String(e),
      errorName: e instanceof Error ? e.constructor.name : 'Unknown',
    }
  }

  // 4. Тест JWT
  try {
    const token = createToken({ userId: 'test-user-id', role: 'ADMIN' })
    const decoded = decodeToken(token)
    checks.jwt = {
      tokenCreated: !!token,
      tokenLength: token.length,
      tokenDecoded: !!decoded,
      decodedUserId: decoded?.userId ?? null,
      note: decoded
        ? '✓ JWT sign + verify works'
        : '✗ JWT verify FAILED after sign',
    }
  } catch (e) {
    checks.jwt = {
      error: e instanceof Error ? e.message : String(e),
      errorName: e instanceof Error ? e.constructor.name : 'Unknown',
    }
  }

  // 5. Тест hashPassword (асинхронный bcrypt)
  try {
    const hash = await hashPassword('test')
    checks.hashPassword = {
      works: true,
      hashStartsWithBcrypt: hash.startsWith('$2'),
      hashLength: hash.length,
    }
  } catch (e) {
    checks.hashPassword = {
      works: false,
      error: e instanceof Error ? e.message : String(e),
      errorName: e instanceof Error ? e.constructor.name : 'Unknown',
    }
  }

  return NextResponse.json(checks, { status: 200 })
}
