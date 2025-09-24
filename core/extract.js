// core/extract.js
import { parseAmount } from "../utils/parse.js"

export function extractFields(userText) {
  const s = String(userText || "").slice(0, 4000)
  const t = s.toLowerCase()

  let amount = parseAmount(t)
  let currency = "UZS"
  if (/\busd\b|\$/.test(t)) currency = "USD"
  else if (/\beur\b|€/.test(t)) currency = "EUR"
  else if (/\brub\b|\brur\b|₽|руб/.test(t)) currency = "RUB"
  else if (/\bkzt\b|₸|тенге|tenge/.test(t)) currency = "KZT"
  else if (/\buzs\b|сум|сўм|so'm|som|\b[сc]\b/.test(t)) currency = "UZS"

  let payment_method = "unknown"
  const reCash = /(касс|налич|на\s*рук|пко|рко|ккм|ккт)/i
  const reBank = /(р[ .-/]?с|\bрс\b|\bр\.с\b|\bр-с\b|расч[её]тн|б\/н|\bбн\b|безнал|\bп\/п\b|\bпп\b|банк|swift|wire|bank\s*transfer|межбанк|pos|терминал|эквайр|экв(?:ай|а)р|карта|uzcard|humo|visa|mastercard|plastik|card)/i
  if (reCash.test(t)) payment_method = "cash"
  else if (reBank.test(t)) payment_method = "r/s"

  let vat = "unknown"
  if (/(без\s*ндс|ндс\s*нет|qqs\s*yo'?q|qqs\s*yoq|vat\s*0%|nds\s*0%)/i.test(t)) vat = "none"
  else if (/(ндс[^0-9%]{0,6}12\s*%|12\s*%[^0-9%]{0,6}ндс|qqs[^0-9%]{0,6}12\s*%)/i.test(t)) vat = "12%"
  else if (/(ндс[^0-9%]{0,6}20\s*%|20\s*%[^0-9%]{0,6}ндс|qqs[^0-9%]{0,6}20\s*%)/i.test(t)) vat = "20%"

  const fx = {
    operation: s,
    amount: amount === null ? null : Number(amount),
    currency,
    payment_method,
    vat,
    is_about_provodki: true,
    missing: []
  }

  return fx
}
