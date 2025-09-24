// core/classify.js

// Регулярки для проверки "проводочного" текста
const RE_FINANCE = /(дт|кт|проводк|счет|счёт|оплат|перечисл|долг|аванс|ндс|qqs|аренд|зарплат|ish\s*haqi|oylik|касс|р\/с|банк|uzs|\b\d{4}\b)/i
const RE_AMOUNT = /\b\d[\d\s.,]*(млн|mln|миллион|тыс|тысяч|ming|uzs)?\b/i

/**
 * Классификация сообщения.
 * 
 * Возвращает:
 * {
 *   is_about_provodki: true|false,
 *   is_full: true|false
 * }
 */
export function classifyMessage(text) {
  const t = String(text || "").trim().toLowerCase()

  if (!t) {
    return { is_about_provodki: false, is_full: false }
  }

  const hasFinance = RE_FINANCE.test(t)
  const hasAmount = RE_AMOUNT.test(t)

  // Если нет бух-маркеров — не о проводках
  if (!hasFinance) {
    return { is_about_provodki: false, is_full: false }
  }

  // Если есть маркеры и сумма — считаем "полным" запросом
  if (hasFinance && hasAmount) {
    return { is_about_provodki: true, is_full: true }
  }

  // Есть намёк на бухучёт, но запроса неполный
  return { is_about_provodki: true, is_full: false }
}
