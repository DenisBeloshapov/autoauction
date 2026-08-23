import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Отрезает номер лота из НАЧАЛА rawText, чтобы он не дублировался
 * в отображении и в email.
 *
 * Например: "12345 Toyota Camry 2023 White" → "Toyota Camry 2023 White"
 *
 * Важно: отрезает только если строка НАЧИНАЕТСЯ с числа.
 * Числа в середине строки (год выпуска, цена и т.п.) не трогаются.
 * Если rawText уже очищен — возвращает как есть.
 */
export function stripLotNumber(rawText: string | null | undefined): string {
  if (!rawText) return ""
  // Отрезаем только число в самом начале строки (с возможными thousand separators)
  const match = rawText.match(/^\s*(\d{1,3}(?:[,.]\d{3})+|\d+)\s+/)
  if (!match) return rawText.trim()
  return rawText.slice(match[0].length).trim()
}

/**
 * Разбивает строку поиска на отдельные термины.
 * Поддерживает разделители: запятая, пробел, перенос строки, точка с запятой.
 *
 * "12345, 67890" → ["12345", "67890"]
 * "12345 67890" → ["12345", "67890"]
 * "12345\n67890" → ["12345", "67890"]
 */
export function parseSearchTerms(query: string): string[] {
  if (!query) return []
  return query
    .split(/[\s,;\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}
