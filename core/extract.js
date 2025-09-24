// core/extract.js
import { parseAmount } from "../utils/parse.js"

/**
 * Парсинг текста запроса для извлечения ключевых полей.
 * 
 * Возвращает объект:
 * {
 *   operation: string,
 *   amount: number|null,
 *   currency: "UZS"|"USD"|"EUR"|"OTHER",
 *   payment_method: "r/s"|"cash"|"unknown",
 *   vat: "none"|"20%"|"unknown",
 *   is_about_provodki: boolean,
 *   missing: string[]
 * }
 */
export function extractFields(userText) {
  const safeUserText = String(userText || "").slice(0, 4000).toLowerCase()

  let fx = {
    operation: safeUserText,
    amount: null,
    currency: "UZS",
    payment_method: "unknown",
    vat: "unknown",
    is_about_provodki: true,
    missing: []
  }

  // Сумма
  const amt = parseAmount(safeUserText)
  if (amt !== null) fx.amount = amt
  else fx.missing.push("amount")

  // Валюта
  if (/usd|\$/i.test(safeUserText)) fx.currency = "USD"
  else if (/eur|€/.test(safeUserText)) fx.currency = "EUR"
  else if (/uzs|сум|so'm/.test(safeUserText)) fx.currency = "UZS"
  else fx.currency = "UZS" // дефолт

  // Способ оплаты
  if (/касс|налич/i.test(safeUserText)) fx.payment_method = "cash"
  else if (/(р\/с|расчет|банк|перевод|uzcard|humo)/i.test(safeUserText)) fx.payment_method = "r/s"
  else fx.missing.push("payment_method")

  // НДС
  if (/(без\s*ндс|ндс\s*нет|qqs\s*yo'q)/i.test(safeUserText)) fx.vat = "none"
  else if (/(ндс\s*20|20%\s*ндс|qqs\s*20)/i.test(safeUserText)) fx.vat = "20%"
  else fx.missing.push("vat")

  // Операция (действие)
  if (!/(купил|оплат|зарплат|выдал|получил|продал|списал|аванс|аренд|поручител|возврат)/i.test(safeUserText)) {
    fx.missing.push("operation")
  }

  return fx
}
