"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Language = "ru" | "en";

type TranslationKey = string;

// 114 keys across categories: auth, navigation, lots, statuses, wonLots, delivery, email, clients, common
const translations: Record<Language, Record<string, string>> = {
  ru: {
    // auth (6)
    "auth.login": "Войти",
    "auth.logout": "Выйти",
    "auth.username": "Логин",
    "auth.password": "Пароль",
    "auth.loginTitle": "Вход в систему",
    "auth.invalidCredentials": "Неверный логин или пароль",

    // navigation (5)
    "nav.requests": "Заявки",
    "nav.wonSection": "Мои лоты",
    "nav.adminData": "Данные",
    "nav.clients": "Клиенты",

    // lots (12)
    "lots.title": "Лоты",
    "lots.add": "Добавить лот",
    "lots.lotText": "Текст лота",
    "lots.lotTextPlaceholder": "Вставьте текст лота — можно сразу несколько строк, по одному лоту на строку",
    "lots.pasteFromClipboard": "Вставить из буфера обмена",
    "lots.clipboardError": "Не удалось прочитать буфер обмена — разрешите доступ или вставьте текст вручную",
    "lots.lotNumber": "Номер лота",
    "lots.comment": "Комментарий",
    "lots.commentPlaceholder": "Опциональный комментарий",
    "lots.commentAll": "Комментарий (для всех лотов)",
    "lots.commentAllPlaceholder": "Общий комментарий для всех добавленных лотов",
    "lots.addAnother": "Добавить ещё лот",
    "lots.saveN": "Сохранить ({n})",
    "lots.lotN": "Лот {n}",
    "lots.batchCreated": "Создано лотов: {n}",
    "lots.removeLot": "Убрать этот лот",
    "lots.client": "Клиент",
    "lots.rawText": "Оригинальный текст",
    "lots.createdAt": "Создан",
    "lots.noLots": "Лотов нет",
    "lots.deleteConfirm": "Удалить этот лот?",
    "lots.markDeletionConfirm": "Отметить этот лот на удаление? Окончательное удаление подтверждает админ.",
    "lots.markForDeletion": "Отметить на удаление",
    "lots.markedForDeletion": "Лот отмечен на удаление",
    "lots.markedForDeletionLabel": "Отмечен на удаление",
    "lots.clearDeletionMark": "Снять пометку на удаление",
    "lots.deleteSelected": "Удалить выделенные",
    "lots.deleteSelectedConfirm": "Удалить {n} лотов? Это действие нельзя отменить.",
    "lots.deleteSelectedConfirmSkip": "Удалить {n} лотов? {skipped} лотов нельзя удалить (SENT/WON защищены).",
    "lots.deletedCount": "Удалено лотов: {n}",
    "lots.deleteAllProtected": "Все выбранные лоты в статусе SENT/WON — их нельзя удалить",
    "lots.deleteSomeFailed": "Не удалось удалить {n} лотов",
    "lots.formEmail": "Сформировать email",
    "lots.kit": "Группа",
    "lots.kitLots": "Лотов в группе",
    "lots.noComment": "Без комментария",
    "lots.individual": "Отдельные лоты",
    "delivery.choosen": "Выбрано",
    "delivery.ownerData": "Данные получателя",
    "delivery.lotInfo": "Информация о лоте",
    "delivery.requestDelivery": "Запрос доставки",
    "delivery.lotNumber": "Номер лота",
    "delivery.client": "Клиент",
    "delivery.contractModalTitle": "На контракте — детали",
    "delivery.editContractTitle": "Изменить судно / дату погрузки",
    "delivery.editContract": "Изменить судно/дату",
    "delivery.selectForBatch": "Выбрать для пакетного контракта",
    "delivery.selectedCount": "Выбрано лотов: {n}",
    "delivery.confirmBatch": "На контракте (пакетом)",
    "delivery.vesselName": "Название / номер судна",
    "delivery.vesselNamePlaceholder": "Например: MOL Prestige",
    "delivery.loadingDate": "Дата погрузки",
    "delivery.price": "Цена выигрыша",
    "delivery.rawText": "Оригинальный текст",
    "delivery.createdAt": "Дата запроса",

    // statuses (4)
    "status.PENDING": "Ожидает",
    "status.SENT": "Отправлен",
    "status.WON": "Выигран",
    "status.PROCESSING": "В обработке",

    // wonLots (7)
    "wonLots.title": "Выигранные лоты",
    "wonLots.mark": "Отметить как выигранные",
    "wonLots.acceptBids": "Отметить выигранные",
    "wonLots.inputText": "Вставьте результаты торгов",
    "wonLots.inputTextPlaceholder": "12345 Toyota Camry white 500000\n12346 Honda Civic black 750000",
    "wonLots.price": "Цена",
    "wonLots.currency": "JPY",
    "wonLots.noWonLots": "Нет выигранных лотов",

    // delivery (13)
    "delivery.title": "Доставка",
    "delivery.method": "Метод доставки",
    "delivery.ownerFullName": "ФИО владельца",
    "delivery.ownerAddress": "Адрес владельца",
    "delivery.ownerFullNamePlaceholder": "Иванов Иван Иванович",
    "delivery.ownerAddressPlaceholder": "г. Москва, ул. Примерная, 1",
    "delivery.DUTY": "Пошлина",
    "delivery.DISASSEMBLY": "Разбор",
    "delivery.CUT_REAR": "Распил по заду",
    "delivery.CUT_FRONT": "Распил по переду",
    "delivery.CUT_REAR_ARCS": "Распил по задним аркам",
    "delivery.chooseMethod": "Выбрать доставку",
    "delivery.noRequests": "Нет запросов на доставку",
    "delivery.searchPlaceholder": "Поиск по номеру лота, клиенту...",
    "delivery.found": "Найдено",
    "delivery.noSearchResults": "По вашему запросу ничего не найдено",
    "delivery.confirm": "На контракте",
    "delivery.complete": "Завершить",

    // email (8)
    "email.sendSelected": "Отправить выбранные",
    "email.preview": "Предпросмотр email",
    "email.previewHint": "Письмо ещё не отправлено — проверьте текст и выберите действие",
    "email.subject": "Тема",
    "email.recipient": "Получатель",
    "email.body": "Тело письма",
    "email.history": "История email",
    "email.sentAt": "Отправлено",
    "email.copy": "Копировать",
    "email.send": "Отправить",
    "email.smtpSentOk": "Письмо отправлено по SMTP",
    "email.markedSentNoSmtp": "Лоты помечены отправленными (SMTP не настроен)",
    "lots.selectAtLeastOne": "Выберите хотя бы один лот",

    // clients (9)
    "clients.title": "Клиенты",
    "clients.add": "Добавить клиента",
    "clients.name": "Имя",
    "clients.lotsCount": "Лотов",
    "clients.createdAt": "Создан",
    "clients.noClients": "Клиентов нет",
    "clients.newUsername": "Логин нового клиента",
    "clients.newPassword": "Пароль",
    "clients.newName": "Имя (опционально)",

    // common (12)
    "common.cancel": "Отмена",
    "common.save": "Сохранить",
    "common.confirm": "Подтвердить",
    "common.close": "Закрыть",
    "common.delete": "Удалить",
    "common.search": "Поиск",
    "common.loading": "Загрузка...",
    "common.success": "Готово",
    "common.error": "Ошибка",
    "common.all": "Все",
    "common.actions": "Действия",
    "common.total": "Всего",

    // extras (8)
    "app.title": "AuctionWorks",
    "app.tagline": "Японские автоаукционы",
    "app.clientPanel": "Панель клиента",
    "app.adminPanel": "Панель администратора",
    "common.selected": "Выбрано",
    "common.send": "Отправить",
    "filter.byClient": "По клиенту",
    "filter.byStatus": "По статусу",

    // settings
    "settings.title": "Настройки",
    "settings.categorySecurity": "Безопасность",
    "settings.categoryEmail": "Письмо клиентам",
    "settings.categorySmtp": "SMTP-подключение",
    "settings.changePassword": "Сменить пароль",
    "settings.currentPassword": "Текущий пароль",
    "settings.newPassword": "Новый пароль",
    "settings.passwordChanged": "Пароль изменён",
    "settings.emailRecipient": "Email получателя (куда отправлять список лотов)",
    "settings.emailSubjectTemplate": "Шаблон темы письма",
    "settings.emailSubjectHint": "{n} заменится на порядковый номер письма за сегодня (обнуляется каждые сутки)",
    "settings.emailIntroTemplate": "Вступительный текст (необязательно)",
    "settings.emailIntroHint": "Добавляется перед списком лотов — приветствие, инструкции и т.п.",
    "settings.smtpConfig": "Настройки SMTP (отправка email)",
    "settings.smtpHint": "Если не заполнено — email только формируется (можно скопировать). Если заполнено — отправляется автоматически.",
    "settings.smtpHost": "SMTP сервер",
    "settings.smtpPort": "Порт",
    "settings.smtpUser": "Логин SMTP",
    "settings.smtpPassword": "Пароль SMTP",
    "settings.smtpPasswordConfigured": "Пароль настроен (введите новый, чтобы сменить)",
    "settings.smtpFrom": "От кого (имя и email)",

    // lot status label
    "lots.status": "Статус",

    // WonLot statuses
    "wonStatus.WON": "Выигран",
    "wonStatus.awaitingMethod": "Ожидает данные",
    "wonStatus.DELIVERY_REQUESTED": "Ожидает погрузки",
    "wonStatus.DELIVERY_CONFIRMED": "На контракте",
    "wonStatus.COMPLETED": "Завершён",

    // Won preview
    "wonLots.preview": "Предпросмотр выигрышей",
    "wonLots.total": "Итог",
    "wonLots.processedCount": "Найдено строк",
    "wonLots.matchedCount": "Совпадений",
    "wonLots.notFound": "не найден",
    "wonLots.empty": "Введите результаты торгов для предпросмотра",
    "common.refresh": "Обновить",
    "push.enable": "Включить уведомления",
    "push.disable": "Отключить уведомления",
    "push.holdToDisable": "Нажмите для проверки, зажмите для отключения",
    "push.enabled": "Уведомления включены",
    "push.disabled": "Уведомления отключены",
    "push.enabledAndTested": "Уведомления включены — тестовое отправлено, проверьте телефон",
    "push.enabledButTestFailed": "Подписка сохранена, но тест не прошёл",
    "push.testSentCheckDevice": "Тестовое уведомление отправлено — проверьте телефон",
    "push.testFailed": "Тест не прошёл",
    "push.permissionDenied": "Уведомления заблокированы в настройках браузера — разрешите вручную",
    "push.needsInstall": "Сначала добавьте сайт на домашний экран (Поделиться → На экран «Домой»), затем включите уведомления",
    "wonLots.confirmSave": "Подтвердить и сохранить",
    "wonLots.nothingToSave": "Нет ни одного совпавшего лота — нечего сохранять",
    "wonLots.bodyNumber": "Общая информация",
    "wonLots.bodyNumberEdit": "Редактировать",
    "wonLots.bodyNumberPlaceholder": "Общая информация по лоту...",
  },
  en: {
    // auth (6)
    "auth.login": "Sign in",
    "auth.logout": "Sign out",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.loginTitle": "Sign in to AuctionWorks",
    "auth.invalidCredentials": "Invalid username or password",

    // navigation (5)
    "nav.requests": "Requests",
    "nav.wonSection": "My lots",
    "nav.adminData": "Data",
    "nav.clients": "Clients",

    // lots (12)
    "lots.title": "Lots",
    "lots.add": "Add lot",
    "lots.lotText": "Lot text",
    "lots.lotTextPlaceholder": "Paste lot text — you can paste several lines at once, one lot per line",
    "lots.pasteFromClipboard": "Paste from clipboard",
    "lots.clipboardError": "Couldn't read the clipboard — allow access or paste the text manually",
    "lots.lotNumber": "Lot number",
    "lots.comment": "Comment",
    "lots.commentPlaceholder": "Optional comment",
    "lots.commentAll": "Comment (for all lots)",
    "lots.commentAllPlaceholder": "Shared comment for all added lots",
    "lots.addAnother": "Add another lot",
    "lots.saveN": "Save ({n})",
    "lots.lotN": "Lot {n}",
    "lots.batchCreated": "Created lots: {n}",
    "lots.removeLot": "Remove this lot",
    "lots.client": "Client",
    "lots.rawText": "Original text",
    "lots.createdAt": "Created",
    "lots.noLots": "No lots",
    "lots.deleteConfirm": "Delete this lot?",
    "lots.markDeletionConfirm": "Mark this lot for deletion? Admin confirms the permanent delete.",
    "lots.markForDeletion": "Mark for deletion",
    "lots.markedForDeletion": "Lot marked for deletion",
    "lots.markedForDeletionLabel": "Marked for deletion",
    "lots.clearDeletionMark": "Clear deletion mark",
    "lots.deleteSelected": "Delete selected",
    "lots.deleteSelectedConfirm": "Delete {n} lots? This action cannot be undone.",
    "lots.deleteSelectedConfirmSkip": "Delete {n} lots? {skipped} lots cannot be deleted (SENT/WON protected).",
    "lots.deletedCount": "Deleted lots: {n}",
    "lots.deleteAllProtected": "All selected lots are SENT/WON — they cannot be deleted",
    "lots.deleteSomeFailed": "Failed to delete {n} lots",
    "lots.formEmail": "Form email",
    "lots.kit": "Group",
    "lots.kitLots": "Lots in group",
    "lots.noComment": "No comment",
    "lots.individual": "Individual lots",
    "delivery.choosen": "Chosen",
    "delivery.ownerData": "Recipient data",
    "delivery.lotInfo": "Lot info",
    "delivery.requestDelivery": "Request delivery",
    "delivery.lotNumber": "Lot number",
    "delivery.client": "Client",
    "delivery.contractModalTitle": "On contract — details",
    "delivery.editContractTitle": "Edit vessel / loading date",
    "delivery.editContract": "Edit vessel/date",
    "delivery.selectForBatch": "Select for batch contract",
    "delivery.selectedCount": "{n} lots selected",
    "delivery.confirmBatch": "On contract (batch)",
    "delivery.vesselName": "Vessel name / number",
    "delivery.vesselNamePlaceholder": "E.g. MOL Prestige",
    "delivery.loadingDate": "Loading date",
    "delivery.price": "Won price",
    "delivery.rawText": "Original text",
    "delivery.createdAt": "Request date",

    // statuses (4)
    "status.PENDING": "Pending",
    "status.SENT": "Sent",
    "status.WON": "Won",
    "status.PROCESSING": "Processing",

    // wonLots (7)
    "wonLots.title": "Won lots",
    "wonLots.mark": "Mark as won",
    "wonLots.acceptBids": "Mark as won",
    "wonLots.inputText": "Paste auction results",
    "wonLots.inputTextPlaceholder": "12345 Toyota Camry white 500000\n12346 Honda Civic black 750000",
    "wonLots.price": "Price",
    "wonLots.currency": "JPY",
    "wonLots.noWonLots": "No won lots yet",

    // delivery (13)
    "delivery.title": "Delivery",
    "delivery.method": "Delivery method",
    "delivery.ownerFullName": "Owner full name",
    "delivery.ownerAddress": "Owner address",
    "delivery.ownerFullNamePlaceholder": "John Doe",
    "delivery.ownerAddressPlaceholder": "123 Main St, Springfield",
    "delivery.DUTY": "Duty",
    "delivery.DISASSEMBLY": "Disassembly",
    "delivery.CUT_REAR": "Rear cut",
    "delivery.CUT_FRONT": "Front cut",
    "delivery.CUT_REAR_ARCS": "Rear arches cut",
    "delivery.chooseMethod": "Choose delivery",
    "delivery.noRequests": "No delivery requests",
    "delivery.searchPlaceholder": "Search by lot number, client...",
    "delivery.found": "Found",
    "delivery.noSearchResults": "No results found",
    "delivery.confirm": "On contract",
    "delivery.complete": "Complete",

    // email (8)
    "email.sendSelected": "Send selected",
    "email.preview": "Email preview",
    "email.previewHint": "Not sent yet — review the text and choose an action",
    "email.subject": "Subject",
    "email.recipient": "Recipient",
    "email.body": "Email body",
    "email.history": "Email history",
    "email.sentAt": "Sent",
    "email.copy": "Copy",
    "email.send": "Send",
    "email.smtpSentOk": "Email sent via SMTP",
    "email.markedSentNoSmtp": "Lots marked as sent (SMTP not configured)",
    "lots.selectAtLeastOne": "Select at least one lot",

    // clients (9)
    "clients.title": "Clients",
    "clients.add": "Add client",
    "clients.name": "Name",
    "clients.lotsCount": "Lots",
    "clients.createdAt": "Created",
    "clients.noClients": "No clients",
    "clients.newUsername": "New client username",
    "clients.newPassword": "Password",
    "clients.newName": "Name (optional)",

    // common (12)
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.delete": "Delete",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.success": "Done",
    "common.error": "Error",
    "common.all": "All",
    "common.actions": "Actions",
    "common.total": "Total",

    // extras (8)
    "app.title": "AuctionWorks",
    "app.tagline": "Japanese car auctions",
    "app.clientPanel": "Client panel",
    "app.adminPanel": "Admin panel",
    "common.selected": "Selected",
    "common.send": "Send",
    "filter.byClient": "By client",
    "filter.byStatus": "By status",

    "settings.title": "Settings",
    "settings.categorySecurity": "Security",
    "settings.categoryEmail": "Client email",
    "settings.categorySmtp": "SMTP connection",
    "settings.changePassword": "Change password",
    "settings.currentPassword": "Current password",
    "settings.newPassword": "New password",
    "settings.passwordChanged": "Password changed",
    "settings.emailRecipient": "Recipient email (where to send lot list)",
    "settings.emailSubjectTemplate": "Subject template",
    "settings.emailSubjectHint": "{n} is replaced with today's sequential email number (resets daily)",
    "settings.emailIntroTemplate": "Intro text (optional)",
    "settings.emailIntroHint": "Added before the lot list — greeting, instructions, etc.",
    "settings.smtpConfig": "SMTP settings (email sending)",
    "settings.smtpHint": "If empty — email is only generated (copyable). If filled — sent automatically.",
    "settings.smtpHost": "SMTP host",
    "settings.smtpPort": "Port",
    "settings.smtpUser": "SMTP login",
    "settings.smtpPassword": "SMTP password",
    "settings.smtpPasswordConfigured": "Password configured (enter new to change)",
    "settings.smtpFrom": "From (name and email)",

    // lot status label
    "lots.status": "Status",

    // WonLot statuses
    "wonStatus.WON": "Won",
    "wonStatus.awaitingMethod": "Awaiting data",
    "wonStatus.DELIVERY_REQUESTED": "Awaiting loading",
    "wonStatus.DELIVERY_CONFIRMED": "On contract",
    "wonStatus.COMPLETED": "Completed",

    // Won preview
    "wonLots.preview": "Won lots preview",
    "wonLots.total": "Total",
    "wonLots.processedCount": "Lines parsed",
    "wonLots.matchedCount": "Matched",
    "wonLots.notFound": "not found",
    "wonLots.empty": "Paste auction results to see preview",
    "common.refresh": "Refresh",
    "push.enable": "Enable notifications",
    "push.disable": "Disable notifications",
    "push.holdToDisable": "Tap to test, hold to disable",
    "push.enabled": "Notifications enabled",
    "push.disabled": "Notifications disabled",
    "push.enabledAndTested": "Notifications enabled — test sent, check your phone",
    "push.enabledButTestFailed": "Subscription saved, but the test failed",
    "push.testSentCheckDevice": "Test notification sent — check your phone",
    "push.testFailed": "Test failed",
    "push.permissionDenied": "Notifications are blocked in browser settings — allow them manually",
    "push.needsInstall": "Add this site to your home screen first (Share → Add to Home Screen), then enable notifications",
    "wonLots.confirmSave": "Confirm and save",
    "wonLots.nothingToSave": "No matched lots — nothing to save",
    "wonLots.bodyNumber": "General information",
    "wonLots.bodyNumberEdit": "Edit",
    "wonLots.bodyNumberPlaceholder": "General information about the lot...",
  },
};

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously (client-only state)
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return "ru";
    const saved = localStorage.getItem("aa_lang") as Language | null;
    return saved === "en" || saved === "ru" ? saved : "ru";
  });

  // Persist on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aa_lang", lang);
    }
  }, [lang]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return translations[lang][key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be inside LanguageProvider");
  return ctx;
}
