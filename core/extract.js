import { openai, MODEL } from "../config/env.js"
import { four } from "../utils/helpers.js"
import { parseAmount } from "../utils/parse.js"

export async function extractFields(userText) {
  const safeUserText = String(userText || "").slice(0, 4000)
  const r = await openai.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: "Извлекай поля из свободного RU/UZ текста. Ответ только JSON." },
      { role: "user", content: `Текст: ${safeUserText}\nВерни только JSON со следующими полями:\n{"operation": string,"amount": number|null,"currency": "UZS"|"USD"|"EUR"|"OTHER","payment_method": "r/s"|"cash"|"unknown","vat": "none"|"20%"|"unknown","counterparty_role": string,"documents": string[],"notes": string,"is_about_provodki": boolean,"missing": string[]}\nПравила:\n- Если валюта не указана: UZS\n- Если про НДС ничего: unknown\n- Если способ оплаты не понятен: unknown` }
    ]
  })

  let obj
  try { obj = JSON.parse(r.output_text) }
  catch {
    obj = {
      operation: "",
      amount: null,
      currency: "UZS",
      payment_method: "unknown",
      vat: "unknown",
      counterparty_role: "unknown",
      documents: [],
      notes: safeUserText,
      is_about_provodki: true,
      missing: ["parse_error"]
    }
  }

  if (Array.isArray(obj.entries)) {
    obj.entries = obj.entries.map(e => ({ ...e, debit: four(e.debit), credit: four(e.credit) }))
  }
  return obj
}

export function patchFromShortReply(fx, text) {
  const t = String(text || "").toLowerCase()
  const amt = parseAmount(t)
  if (amt !== null) fx.amount = amt
  if (/касс/.test(t)) fx.payment_method = "cash"
  if (/(р\/с|расч|банк|перевод|uzcard|humo)/.test(t)) fx.payment_method = "r/s"
  if (/(без\s*ндс|ндс\s*нет|qqs\s*yo'q)/.test(t)) fx.vat = "none"
  if (/(ндс\s*20|20%\s*ндс|qqs\s*20)/.test(t)) fx.vat = "20%"
  return fx
}
