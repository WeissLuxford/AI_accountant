// core/validators.js
import { normAccountsInText } from "../utils/helpers.js"

const MAP_PAYROLL = { "7010": "6710", "2410": "6410", "2420": "6520", "1110": "5110" }

function extractAccounts(html) {
  const set = new Set()
  String(html || "").replace(/\b(\d{4})\b/g, (_m, d) => { set.add(d) })
  return Array.from(set)
}

export function detectTopic(fx, originalUserText) {
  const s = `${fx?.operation || ""} ${originalUserText || ""}`.toLowerCase()
  if (/зарплат|з\/п|ish\s*haqi|oylik/.test(s)) return "payroll"
  if (/поставщик|оплат[аи]л|перечисл|6010/.test(s)) return "supplier"
  if (/касс|5010|1010/.test(s)) return "cash"
  if (/аванс|4310/.test(s)) return "advance"
  if (/ндс|qqs|4410|6410/.test(s)) return "vat"
  return "general"
}

function whitelist(topic) {
  if (topic === "payroll") return new Set(["2010","2310","2510","9420","6710","6410","6520","5110","5010","1010"])
  if (topic === "supplier") return new Set(["6010","5110","1010","5010","4410","6410","4310"])
  if (topic === "cash") return new Set(["1010","5010","5110","6010","6710","4310"])
  if (topic === "advance") return new Set(["4310","5110","1010","5010","6010","4410","6410"])
  if (topic === "vat") return new Set(["4410","6410","5110","6010","6710"])
  return null
}

function addCheckItems(html, items) {
  const s = String(html || "")
  if (!items?.length) return s
  const hasBlock = /<h3>\s*Проверьте\s*<\/h3>/i.test(s)
  if (!hasBlock) {
    return s + `<hr/><h3>Проверьте</h3><ul>${items.map(x=>`<li>${x}</li>`).join("")}</ul>`
  }
  return s.replace(/(<h3>\s*Проверьте\s*<\/h3>\s*<ul>)/i, `$1${items.map(x=>`<li>${x}</li>`).join("")}`)
}

export function fixByTopic(html, topic) {
  let out = normAccountsInText(html)
  if (topic === "payroll") {
    out = out.replace(/\b(7010|2410|2420|1110)\b/g, m => MAP_PAYROLL[m] || m)
  }
  return out
}

export function validateAndAnnotate(html, topic) {
  let out = fixByTopic(html, topic)
  const wl = whitelist(topic)
  if (!wl) return out
  const accs = extractAccounts(out)
  const unknown = accs.filter(a => !wl.has(a))
  const notes = []
  if (unknown.length) notes.push(`встречаются нетипичные для темы счета: ${unknown.join(", ")} — проверьте учетную политику и корректность корреспонденций`)
  if (topic === "supplier") {
    const has6010 = /\b6010\b/.test(out)
    const hasPay = /\b(5110|1010|5010)\b/.test(out)
    if (!has6010) notes.push("уточните, отражена ли кредиторская задолженность поставщику на 6010")
    if (!hasPay) notes.push("уточните источник оплаты: расчетный счет 5110 или касса 1010/5010")
  }
  if (topic === "cash") {
    const hasCash = /\b(1010|5010)\b/.test(out)
    if (!hasCash) notes.push("в операциях наличными обычно участвует 1010 или 5010 — проверьте проводку")
  }
  if (topic === "advance") {
    const has4310 = /\b4310\b/.test(out)
    if (!has4310) notes.push("авансы обычно отражаются на 4310 — проверьте выбранный счет")
  }
  if (topic === "vat") {
    const hasVat = /\b(4410|6410)\b/.test(out)
    if (!hasVat) notes.push("для НДС обычно используются 4410 и 6410 — проверьте проводки")
  }
  out = addCheckItems(out, notes)
  return out
}
