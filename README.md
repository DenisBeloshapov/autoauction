# Изменённые файлы — обновление для GitHub

## Список изменённых файлов (21 файл)

```
changed-files/
├── package.json                                              ← добавлены nodemailer, socket.io-client, @types/nodemailer
├── prisma/
│   ├── schema.prisma                                        ← +bodyNumber, +Setting model
│   ├── schema.postgres.prisma                               ← +bodyNumber, +Setting model
│   └── migrations/
│       ├── 20260823000000_add_body_number/migration.sql     ← НОВАЯ миграция (bodyNumber)
│       └── 20260823000001_add_settings/migration.sql        ← НОВАЯ миграция (Setting table)
├── src/
│   ├── app/api/
│   │   ├── auth/change-password/route.ts                    ← НОВЫЙ endpoint (смена пароля)
│   │   ├── email/route.ts                                   ← SMTP отправка + эмит WS
│   │   ├── lots/route.ts                                    ← эмит WS + stripLotNumber
│   │   ├── settings/route.ts                                ← НОВЫЙ endpoint (настройки)
│   │   └── won-lots/route.ts                                ← эмит WS
│   ├── components/aa/
│   │   ├── AdminPanel.tsx                                  ← комплекты в карточки + WS + таб Доставка
│   │   ├── AppShell.tsx                                    ← шестерёнка настроек
│   │   ├── ClientPanel.tsx                                 ← stripLotNumber + WS
│   │   └── SettingsModal.tsx                               ← НОВАЯ модалка настроек
│   ├── contexts/
│   │   └── LanguageContext.tsx                             ← +ключи settings, +bodyNumber
│   ├── hooks/
│   │   └── use-realtime.ts                                 ← НОВЫЙ hook для WebSocket
│   └── lib/
│       ├── email.ts                                         ← НОВЫЙ helper SMTP
│       ├── realtime.ts                                     ← НОВЫЙ helper WS emit
│       └── utils.ts                                        ← +stripLotNumber, +parseSearchTerms
└── mini-services/
    └── realtime/
        ├── index.ts                                         ← НОВЫЙ WebSocket service (порт 3003)
        └── package.json                                     ← НОВЫЙ package для mini-service
```

## Как обновить

1. Скачайте архив `autoauction-changed-files.tar.gz`
2. Распакуйте
3. Скопируйте файлы в репозиторий, сохраняя структуру папок
4. Закоммитьте и запушьте на GitHub

```bash
git add -A
git commit -m "UI: kit cards, settings modal, SMTP, WebSocket, stripLotNumber"
git push
```

## Что нового

### 1. Комплекты в карточки с одним чекмарком
- Лоты с одинаковым комментарием одного клиента → в одну карточку
- ОДИН чекмарк на весь комплект (выбирает/снимает все лоты)
- Indeterminate state (квадратик) если выбрана часть лотов

### 2. Placeholder ФИО
- «Иванов Иван Иванович» вместо «Иванов И.И.»

### 3. Настройки админа (шестерёнка)
- Смена пароля (текущий + новый)
- Email получателя (куда отправлять список лотов)
- SMTP настройки (host, port, user, from, password)
- Если SMTP не настроен — email только формируется (можно скопировать)
- Если SMTP настроен — email отправляется автоматически

### 4. SMTP отправка
- nodemailer
- При «Сформировать email» — пытается отправить через SMTP
- Возвращает `smtpSent: true/false` и `smtpError` если ошибка

### 5. WebSocket (real-time обновления)
- Mini-service на порту 3003 (mini-services/realtime/)
- Socket.io
- События: lot:created, lot:updated, lot:deleted, wonlot:created, delivery:created, email:sent
- При получении события — фронтенд автоматически обновляет данные
- Если WS недоступен — приложение работает в обычном режиме (polling при действиях)

### 6. Миграции БД
- `20260823000000_add_body_number` — добавляет колонку bodyNumber в WonLot
- `20260823000001_add_settings` — создаёт таблицу Setting
- Применяются автоматически при деплое через `prisma migrate deploy`

## Запуск mini-service (WebSocket)

Mini-service нужно запускать отдельно для real-time обновлений:

```bash
cd mini-services/realtime
npm install  # или bun install
bun run dev  # запустит на порту 3003
```

На Vercel mini-service не запускается автоматически — приложение работает без real-time, но все остальные функции доступны.

## После обновления

1. Запушьте на GitHub
2. Vercel задеплоит (1-2 минуты)
3. Миграции применятся автоматически
4. Проверьте:
   - admin → «Все лоты» → комплекты в карточках
   - admin → шестерёнка → настройки (смена пароля, email, SMTP)
   - admin → «Сформировать email» → если SMTP настроен, email отправится автоматически
