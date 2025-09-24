// core/classify.js

/**
 * Классификация сообщения.
 *
 * Теперь без строгих проверок — любое непустое сообщение считаем запросом по проводкам.
 * Возвращает:
 * {
 *   is_about_provodki: true|false,
 *   is_full: true|false
 * }
 */
export function classifyMessage(text) {
  const t = String(text || "").trim()
  if (!t) {
    return { is_about_provodki: false, is_full: false }
  }
  return { is_about_provodki: true, is_full: true }
}
