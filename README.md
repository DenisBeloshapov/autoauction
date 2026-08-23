# Изменённые файлы — обновление для GitHub

Эти файлы нужно скопировать в ваш GitHub-репозиторий, заменив существующие.

## Список изменённых файлов

```
changed-files/
├── package.json                                              ← обновлён build script
├── prisma/
│   ├── schema.prisma                                        ← добавлено поле bodyNumber
│   ├── schema.postgres.prisma                               ← добавлено поле bodyNumber
│   └── migrations/
│       └── 20260823000000_add_body_number/
│           └── migration.sql                                ← НОВАЯ миграция
├── src/
│   ├── app/api/
│   │   ├── debug/route.ts                                   ← без изменений (диагностика)
│   │   ├── email/route.ts                                  ← отрезает номер из rawText
│   │   ├── lots/route.ts                                   ← отрезает номер из rawText при создании
│   │   └── won-lots/route.ts                                ← извлекает bodyNumber при ставках
│   ├── components/aa/
│   │   ├── AdminPanel.tsx                                  ← комплекты + таб Доставка + поиск
│   │   └── ClientPanel.tsx                                 ← отрезает номер из rawText
│   ├── contexts/
│   │   └── LanguageContext.tsx                              ← новые i18n ключи
│   └── lib/
│       └── utils.ts                                        ← функции stripLotNumber, parseSearchTerms
```

## Как обновить

### Вариант 1: Через git (рекомендуется)

```bash
# В папке вашего локального проекта
# Скопируйте файлы из changed-files/ в корень проекта с заменой

# Linux/macOS:
cp -r changed-files/* .

# Windows (PowerShell):
Copy-Item -Path changed-files\* -Destination . -Recurse -Force

# Закоммитить и запушить
git add -A
git commit -m "UI: kits for admin, delivery tab with search, strip lot number from rawText"
git push
```

### Вариант 2: Вручную через GitHub web-интерфейс

Зайдите в репозиторий на GitHub и загрузите каждый файл через "Upload files", сохраняя структуру папок.

## Что нового

### 1. Комплекты у админа в «Все лоты»
- Лоты с одинаковым комментарием одного клиента группируются в комплект
- Заголовок комплекта: «📦 Комплект · Имя клиента · 💬 комментарий · N лотов»
- Лоты без комментария показываются отдельно

### 2. Убран номер лота из «Оригинального текста»
- При создании лота номер автоматически отрезается из rawText
- Везде в отображении (таблицы, карточки, email) номер не дублируется
- Пример: было «12345 Toyota Camry 2023 White» → стало «Toyota Camry 2023 White»

### 3. Новый таб «Доставка» у админа
- Показывает все доставки всех клиентов (как у клиента, но для всех)
- Поле поиска поддерживает несколько номеров кузова/лота
- Разделители: запятая, пробел, перенос строки, точка с запятой
- Пример: «Toyota, Honda, 12345» найдёт все лоты где есть любое из этих слов

### 4. bodyNumber (номер кузова) при принятии ставок
- При «Принять ставки» парсер извлекает:
  - lotNumber (первое число)
  - price (последнее число)
  - bodyNumber (текст между ними — номер кузова)
- Пример: «12345 HONDA PRELUDE white 500000»
  → lotNumber=12345, price=500000, bodyNumber="HONDA PRELUDE white"
- bodyNumber сохраняется в БД и используется для поиска в «Доставка»
- В предпросмотре ставок добавлена колонка «Номер кузова»

### 5. Раздел «Выигранные» у админа
- Колонка «Оригинальный текст» заменена на «Номер кузова» (bodyNumber)
- Если bodyNumber пустой — показывается отрезанный rawText

## Миграция БД (автоматически)

Файл `prisma/migrations/20260823000000_add_body_number/migration.sql` добавит колонку `bodyNumber` в таблицу `WonLot`. Миграция применяется автоматически при деплое на Vercel (через `prisma migrate deploy` в build script).

Для локальной разработки выполните:
```bash
npx prisma migrate dev --name add_body_number
# или
npx prisma db push
```

## После обновления

1. Запушьте изменения на GitHub
2. Vercel автоматически задеплоит (1-2 минуты)
3. Проверьте:
   - Зайдите как admin → «Все лоты» → увидите комплекты
   - Зайдите как admin → «Доставка» → попробуйте поиск
   - Зайдите как admin → «Принять ставки» → вставьте «12345 HONDA PRELUDE white 500000» → увидите bodyNumber в предпросмотре
