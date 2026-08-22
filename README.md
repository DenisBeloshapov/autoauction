# AutoAuction

Веб-приложение для управления японскими автомобильными аукционами: добавление лотов, отправка заявок на аукцион, учёт выигрышей и управление доставкой выигранных автомобилей.

**Стек:** Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS v4 · shadcn/ui · Prisma 6 · PostgreSQL (продакшен) / SQLite (локально) · Framer Motion · bcrypt + JWT auth

---

## Возможности

### Для клиентов
- **Мои лоты** — добавление лотов через вставку неструктурированного текста (номер извлекается автоматически), множественное добавление с общим комментарием, группировка лотов в комплекты по одинаковым комментариям
- **Выигранные** — таблица выигранных лотов с ценами в JPY, выбор метода доставки (5 вариантов), для DUTY — поля ФИО и адреса владельца
- **Доставка** — развёрнутая информация по каждому запросу: данные лота + данные получателя (для полного импорта)

### Для администраторов
- **Все лоты** — таблица всех лотов с фильтрами, чекбоксы для массового выбора, кнопка «Сформировать email» (генерирует email с группированными комментариями), кнопка «Удалить выделенные»
- **Выигранные** — кнопка «Принять ставки» (вставка результатов торгов, парсер извлекает номер лота и цену, поддерживает точки и запятые как thousand separators — `230.000` / `230,000` / `1,500,000`)
- **Клиенты** — список клиентов с количеством лотов, drill-down по клику показывает лоты выбранного клиента inline
- **История email** — список отправленных партий с возможностью просмотра и копирования

### Общее
- Двуязычный интерфейс (RU/EN) с мгновенным переключением
- Адаптивный дизайн: десктоп — боковое меню, мобильный — нижний таббар + FAB
- Модалки выезжают снизу на мобильном (bottom sheet)
- Пульсация статусов PENDING/DELIVERY_REQUESTED
- Защита от зума страницы при фокусе на input (mobile)
- Мягкие тени, плавные stagger-анимации появления карточек

---

## Быстрый старт (локальная разработка)

### Требования
- Node.js 18+ (рекомендуется 20+)
- npm или pnpm

### Автоматическая настройка (Windows — PowerShell или cmd)

В проекте есть скрипт `setup.ps1` (и `.bat`-обёртка), который выполнит всю настройку за вас: проверит Node.js, спросит DATABASE_URL, сгенерирует JWT_SECRET, создаст `.env`, установит зависимости, применит схему и заполнит БД.

```bash
# Через PowerShell (правый клик → "Открыть в PowerShell" или:
powershell -ExecutionPolicy Bypass -File setup.ps1

# Через командную строку:
setup.bat
```

Скрипт спросит:
1. Использовать PostgreSQL (для Vercel) или SQLite (только локально)?
2. Если PostgreSQL — вставьте Connection string из Neon
3. Email получателя по умолчанию (Enter = auction@company.com)
4. Запустить dev-сервер после настройки?

### Ручная установка (Linux/macOS или если не хотите скрипт)

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать .env.example в .env
cp .env.example .env

# 3. Сгенерировать JWT_SECRET (минимум 32 символа)
openssl rand -base64 32

# Вставить значение в .env:
# JWT_SECRET="ваше_сгенерированное_значение"

# 4. Создать БД и применить схему (SQLite по умолчанию)
npx prisma db push

# 5. Заполнить БД тестовыми данными
npm run db:seed

# 6. Запустить dev-сервер
npm run dev
```

Открыть http://localhost:3000

### Тестовые учётные данные

| Роль | Логин | Пароль |
|------|-------|--------|
| ADMIN | `admin` | `admin123` |
| CLIENT | `testclient` | `client123` |

---

## Деплой на Vercel

### Шаг 1. Создать PostgreSQL-базу на Neon

1. Зарегистрируйтесь на [neon.tech](https://neon.tech) (бесплатно, 0.5 ГБ)
2. Создайте новый проект → скопируйте connection string вида:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/autoauction?sslmode=require
   ```

### Шаг 2. Переключить Prisma на PostgreSQL

```bash
# Заменить схему на PostgreSQL-версию
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Создать миграции
npx prisma migrate dev --name init
```

### Шаг 3. Заполнить продакшен-БД

```bash
# Установить DATABASE_URL из Neon временно для seed
export DATABASE_URL="postgresql://...@neon.tech/autoauction?sslmode=require"
npm run db:seed
```

### Шаг 4. Деплой на Vercel

**Вариант A — через Vercel CLI:**

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

**Вариант B — через GitHub:**

1. Запушьте репозиторий на GitHub
2. На [vercel.com](https://vercel.com) → New Project → Import из GitHub
3. Vercel автоматически определит Next.js

### Шаг 5. Настроить переменные окружения

В Vercel dashboard → Settings → Environment Variables добавьте:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...@neon.tech/autoauction?sslmode=require` |
| `JWT_SECRET` | ваш сгенерированный секрет (32+ символов) |
| `JWT_EXPIRES_IN` | `7d` |
| `DEFAULT_EMAIL_RECIPIENT` | `auction@company.com` |
| `UPSTASH_REDIS_REST_URL` | (опционально) `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | (опционально) `axxxxx` |

После изменения переменных выполните **Redeploy**.

---

## Безопасность

| Механизм | Реализация |
|----------|------------|
| Хеширование паролей | **bcrypt** (cost factor 12, per-user salt) |
| Сессионные токены | **JWT** с подписью HS256, expiry 7 дней |
| Rate limiting | 10 попыток входа в минуту на IP (Upstash Redis в проде, in-memory локально) |
| RBAC | role-based access control (ADMIN/CLIENT) на всех mutation-эндпоинтах |
| Валидация входных данных | на всех API-маршрутах |
| Защита от удаления чужих лотов | клиенты видят и удаляют только свои лоты |

### Рекомендации для продакшена
- Использовать HTTPS (Vercel предоставляет автоматически)
- Регулярно делать backup БД (Neon имеет встроенный backup)
- Ротировать `JWT_SECRET` при компрометации
- Настроить мониторинг ошибок (Sentry, Vercel Analytics)

---

## Структура проекта

```
autoauction/
├── prisma/
│   ├── schema.prisma            # SQLite-схема (локальная разработка)
│   └── schema.postgres.prisma   # PostgreSQL-схема (Vercel/Neon)
├── scripts/
│   └── seed-admin.ts            # Создаёт admin + testclient
├── setup.ps1                    # Скрипт настройки (PowerShell, Windows)
├── setup.bat                    # Обёртка для запуска из cmd
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts     # POST /api/auth/login
│   │   │   │   ├── verify/route.ts    # GET /api/auth/verify
│   │   │   │   └── register/route.ts  # POST /api/auth/register (ADMIN)
│   │   │   ├── lots/route.ts          # GET/POST/PUT/DELETE /api/lots
│   │   │   ├── won-lots/route.ts      # GET/POST /api/won-lots
│   │   │   ├── delivery/route.ts      # GET/POST /api/delivery
│   │   │   ├── email/route.ts         # GET/POST /api/email
│   │   │   ├── users/route.ts         # GET/POST /api/users (ADMIN)
│   │   │   └── route.ts               # GET /api (health check)
│   │   ├── layout.tsx                 # Корневой layout + viewport meta
│   │   ├── page.tsx                   # Диспетчер на основе роли
│   │   └── globals.css                # Дизайн-система
│   ├── components/aa/
│   │   ├── AdminPanel.tsx             # Панель администратора
│   │   ├── ClientPanel.tsx            # Панель клиента
│   │   ├── AppShell.tsx               # Sidebar + bottom tabbar + FAB
│   │   ├── LoginPage.tsx              # Экран входа
│   │   ├── Modal.tsx                  # Bottom-sheet модалки
│   │   ├── StatusBadge.tsx            # Badge с пульсацией
│   │   └── LanguageToggle.tsx         # Переключатель RU/EN
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state + login/logout
│   │   ├── LanguageContext.tsx        # i18n (130+ ключей RU/EN)
│   │   └── Providers.tsx              # Обёртка провайдеров
│   └── lib/
│       ├── db.ts                      # Prisma client
│       ├── auth.ts                    # bcrypt + JWT
│       ├── session.ts                 # getAuthUser
│       ├── ratelimit.ts               # Upstash Redis rate limiter
│       └── utils.ts                   # cn() helper
├── .env.example                       # Шаблон переменных окружения
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

---

## API

| Method | Endpoint | Описание | Доступ |
|--------|----------|----------|--------|
| POST | `/api/auth/login` | Вход, возвращает JWT | Public |
| GET | `/api/auth/verify` | Проверка токена | Authenticated |
| POST | `/api/auth/register` | Регистрация клиента | ADMIN |
| GET | `/api/lots` | Список лотов (с фильтрами) | Authenticated |
| POST | `/api/lots` | Создать лот (извлекает номер) | CLIENT |
| PUT | `/api/lots` | Массовое обновление статусов | ADMIN |
| DELETE | `/api/lots?id=<lotId>` | Удалить лот (любой статус) | Authenticated |
| GET | `/api/won-lots` | Список выигранных лотов | Authenticated |
| POST | `/api/won-lots` | Принять ставки (парсер) | ADMIN |
| GET | `/api/delivery` | Запросы доставки | Authenticated |
| POST | `/api/delivery` | Создать/обновить доставку | Authenticated |
| GET | `/api/email` | История email-партий | Authenticated |
| POST | `/api/email` | Сформировать email | ADMIN |
| GET | `/api/users` | Список пользователей | ADMIN |
| POST | `/api/users` | Создать пользователя | ADMIN |

---

## Лицензия

MIT — свободно используйте, изменяйте и распространяйте.

---

## Развитие

Возможные улучшения:
- WebSocket для real-time обновления лотов
- Скачивание email-партий в `.eml` формате
- Прикрепление реального SMTP-отправщика
- Дашборд со статистикой выигрышей
- Экспорт лотов в Excel/CSV
- Поиск по всем лотам с пагинацией
- Двухфакторная аутентификация для админа
- Аудит-лог критических действий
