# ============================================================================
# AutoAuction — Setup Script (PowerShell)
# ============================================================================
# Запуск:
#   .\setup.ps1
#
# Что делает:
#   1. Проверяет наличие Node.js 18+ и npm
#   2. Устанавливает зависимости (npm install)
#   3. Спрашивает DATABASE_URL от Neon (или предлагает использовать SQLite)
#   4. Генерирует JWT_SECRET
#   5. Создаёт .env с правильными значениями
#   6. Если PostgreSQL — переключает схему и создаёт миграции
#   7. Запускает seed (создаёт admin + testclient)
#   8. Показывает итоговые учётные данные
#
# Скрипт идемпотентный — можно запускать повторно.
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Удобные функции
function Write-Step  { param([string]$msg) Write-Host "`n[ШАГ] $msg" -ForegroundColor Cyan }
function Write-OK    { param([string]$msg) Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Write-Warn2 { param([string]$msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "[ERR!] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  AutoAuction — Setup Wizard" -ForegroundColor Magenta
Write-Host "  Подготовка проекта к локальному запуску или деплою на Vercel" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

# Проверяем, что запущено из папки проекта
if (-not (Test-Path "package.json") -or -not (Test-Path "prisma")) {
    Write-Err "Скрипт нужно запускать из корневой папки проекта (где лежит package.json)."
    Write-Host "  Перейдите в папку проекта и запустите: .\setup.ps1"
    exit 1
}

# --- ШАГ 1: Проверка Node.js ---
Write-Step "Проверка Node.js..."

try {
    $ErrorActionPreference = "Continue"
    $nodeVersionRaw = (node --version 2>$null)
    $ErrorActionPreference = "Stop"
    if (-not $nodeVersionRaw) { throw "node not found" }
    $nodeVersion = $nodeVersionRaw -replace '^v', ''
    $nodeMajor = [int]($nodeVersion -split '\.')[0]
} catch {
    Write-Err "Node.js не установлен или недоступен в PATH."
    Write-Host "  Установите Node.js 18+ с https://nodejs.org/ и перезапустите терминал."
    exit 1
}

if ($nodeMajor -lt 18) {
    Write-Err "Установлен Node.js $nodeVersionRaw. Требуется версия 18 или выше."
    Write-Host "  Обновите Node.js с https://nodejs.org/"
    exit 1
}

Write-OK "Node.js $nodeVersionRaw"

# Проверяем npm
try {
    $ErrorActionPreference = "Continue"
    $npmVersion = (npm --version 2>$null)
    $ErrorActionPreference = "Stop"
    if (-not $npmVersion) { throw "npm not found" }
    Write-OK "npm v$npmVersion"
} catch {
    Write-Err "npm недоступен в PATH. Переустановите Node.js."
    exit 1
}

# --- ШАГ 2: Выбор базы данных ---
Write-Step "Выбор базы данных"
Write-Host ""
Write-Host "  1) PostgreSQL (Neon)  — для деплоя на Vercel (рекомендуется)"
Write-Host "  2) SQLite            — для локальной разработки без деплоя"
Write-Host ""
$dbChoice = Read-Host "Выберите [1/2] (по умолчанию 2)"

if ($dbChoice -eq "1") {
    $usePostgres = $true
} else {
    $usePostgres = $false
    $dbChoice = "2"
}

# --- ШАГ 3: Получение DATABASE_URL (если PostgreSQL) ---
$databaseUrl = ""
if ($usePostgres) {
    Write-Step "Получение DATABASE_URL от Neon"
    Write-Host ""
    Write-Host "  1. Откройте https://neon.tech и зарегистрируйтесь (бесплатно, 0.5 ГБ)"
    Write-Host "  2. Создайте новый проект"
    Write-Host "  3. На вкладке Dashboard → Connection Details скопируйте Connection string"
    Write-Host "     (он выглядит так: postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require)"
    Write-Host ""
    $databaseUrl = Read-Host "Вставьте Connection string из Neon"

    if (-not $databaseUrl) {
        Write-Err "DATABASE_URL обязателен для PostgreSQL."
        Write-Host "  Скрипт остановлен. Перезапустите его, когда будете готовы."
        exit 1
    }

    # Если пользователь забыл sslmode — добавим
    if ($databaseUrl -notmatch 'sslmode=') {
        $databaseUrl = $databaseUrl.TrimEnd('/').TrimEnd('?')
        if ($databaseUrl -match '\?') {
            $databaseUrl += "&sslmode=require"
        } else {
            $databaseUrl += "?sslmode=require"
        }
        Write-Warn2 "Добавлен параметр sslmode=require (был отсутствовать)."
    }

    # Обернём в кавычки для .env, если их нет
    if ($databaseUrl -notmatch '^"') {
        $databaseUrl = '"' + $databaseUrl + '"'
    }

    Write-OK "DATABASE_URL принят"
} else {
    # SQLite — используем локальный файл
    $databaseUrl = '"file:./db/custom.db"'
    Write-OK "Используется SQLite (файл ./db/custom.db)"
}

# --- ШАГ 4: Генерация JWT_SECRET ---
Write-Step "Генерация JWT_SECRET"

# Генерируем 32 случайных байта и кодируем в base64
$secretBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($secretBytes)
$rng.Dispose()
$jwtSecret = [Convert]::ToBase64String($secretBytes)
Write-OK "Сгенерирован случайный JWT_SECRET (32 байта)"

# --- ШАГ 5: Установка зависимостей ---
Write-Step "Установка npm-зависимостей (это может занять 1-2 минуты)..."

# Прячем прогресс, чтобы не тормозил на Windows
$env:npm_config_progress = "false"

# Проблема: npm пишет предупреждения (npm warn) в stderr, а PowerShell 5.1
# воспринимает любой вывод в stderr как ошибку и прерывает скрипт через
# $ErrorActionPreference = "Stop" (в начале файла).
#
# Решение:
# 1. Временно отключаем Stop-on-error
# 2. Вызываем npm с флагами --no-audit --no-fund (убирает лишние предупреждения)
# 3. Сливаем stderr с stdout через 2>&1, чтобы PowerShell не интерпретировал
#    stderr как NativeCommandError
# 4. Проверяем реальный код возврата $LASTEXITCODE

$ErrorActionPreference = "Continue"
& npm install --no-audit --no-fund 2>&1 | Out-Host
$npmExitCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($npmExitCode -ne 0) {
    Write-Err "Ошибка при установке зависимостей (код $npmExitCode)."
    Write-Host "  Попробуйте вручную: npm install"
    exit 1
}
Write-OK "Зависимости установлены"

# --- ШАГ 6: Переключение Prisma-схемы ---
if ($usePostgres) {
    Write-Step "Переключение Prisma-схемы на PostgreSQL"
    Copy-Item -Path "prisma/schema.postgres.prisma" -Destination "prisma/schema.prisma" -Force
    Write-OK "prisma/schema.prisma → PostgreSQL"
} else {
    Write-Step "Используется SQLite-схема (по умолчанию)"
    # Ничего не делаем, schema.prisma уже настроена на SQLite
}

# --- ШАГ 7: Создание .env ---
Write-Step "Создание .env"

$emailRecipient = Read-Host "Email получателя по умолчанию (Enter = auction@company.com)"
if (-not $emailRecipient) {
    $emailRecipient = "auction@company.com"
}

$envContent = @"
DATABASE_URL=$databaseUrl
DEFAULT_EMAIL_RECIPIENT="$emailRecipient"
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN="7d"
"@

# Удаляем кавычки вокруг DATABASE_URL, если они внутри — Prisma принимает без них,
# но для PowerShell и cross-env удобнее с кавычками. Оставляем как есть.
Set-Content -Path ".env" -Value $envContent -Encoding UTF8 -NoNewline
Add-Content -Path ".env" -Value "" -Encoding UTF8  # пустая строка в конце

Write-OK ".env создан"

# --- ШАГ 8: Применение схемы к БД ---
Write-Step "Применение схемы к базе данных"

# Важно: npx prisma может писать логи и предупреждения в stderr.
# Временно отключаем Stop-on-error, проверяем реальный код возврата.
$ErrorActionPreference = "Continue"

if ($usePostgres) {
    Write-Host "  Применение миграций к Neon PostgreSQL..."
    & npx prisma migrate dev --name init 2>&1 | Out-Host
    $prismaExit = $LASTEXITCODE
    if ($prismaExit -ne 0) {
        $ErrorActionPreference = "Stop"
        Write-Err "Ошибка при миграции (код $prismaExit). Проверьте DATABASE_URL в .env"
        exit 1
    }
    Write-OK "Миграции применены"
} else {
    # SQLite — создаём папку db если её нет
    if (-not (Test-Path "db")) {
        New-Item -ItemType Directory -Path "db" | Out-Null
    }
    Write-Host "  Создание SQLite-файла и применение схемы..."
    & npx prisma db push 2>&1 | Out-Host
    $prismaExit = $LASTEXITCODE
    if ($prismaExit -ne 0) {
        $ErrorActionPreference = "Stop"
        Write-Err "Ошибка при создании БД (код $prismaExit)."
        exit 1
    }
    Write-OK "БД создана (db/custom.db)"
}

$ErrorActionPreference = "Stop"

# --- ШАГ 9: Заполнение БД (seed) ---
Write-Step "Заполнение БД тестовыми данными"

$ErrorActionPreference = "Continue"
& npx tsx scripts/seed-admin.ts 2>&1 | Out-Host
$seedExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($seedExit -ne 0) {
    Write-Warn2 "Seed-скрипт завершился с ошибкой (код $seedExit). Попробуйте вручную: npm run db:seed"
} else {
    Write-OK "БД заполнена"
}

# --- ИТОГ ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✅ Настройка завершена!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

if ($usePostgres) {
    Write-Host "  База данных:        PostgreSQL (Neon)" -ForegroundColor White
} else {
    Write-Host "  База данных:        SQLite (db/custom.db)" -ForegroundColor White
}

Write-Host "  Учётные данные:" -ForegroundColor White
Write-Host "    ADMIN:   admin / admin123" -ForegroundColor Yellow
Write-Host "    CLIENT:  testclient / client123" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Запуск dev-сервера:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host "  Затем откройте http://localhost:3000" -ForegroundColor White
Write-Host ""

if ($usePostgres) {
    Write-Host "  Для деплоя на Vercel:" -ForegroundColor White
    Write-Host "    1. git init && git add . && git commit -m 'init'" -ForegroundColor White
    Write-Host "    2. Запушьте на GitHub" -ForegroundColor White
    Write-Host "    3. На vercel.com → Import проект из GitHub" -ForegroundColor White
    Write-Host "    4. Добавьте env-переменные из .env в Vercel dashboard" -ForegroundColor White
    Write-Host ""
}

# Предложить запустить dev-сервер
$startDev = Read-Host "Запустить dev-сервер сейчас? [y/N]"
if ($startDev -match '^[yY]') {
    Write-Host "`nЗапуск npm run dev... (Ctrl+C для остановки)" -ForegroundColor Cyan
    $ErrorActionPreference = "Continue"
    & npm run dev
    $ErrorActionPreference = "Stop"
}
