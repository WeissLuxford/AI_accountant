// core/validators.js
const PAYROLL_FORBIDDEN = new Set(["7010","2410","2420","1110"])
const KNOWN_ACCOUNTS = new Set([
  "1010","1020","1030","1210","1220","1510","2010","2310","2510","3310","4010","4110",
  "4410","5110","5010","5210","5310","5410","6010","6210","6310","6410","6510","6520",
  "6610","6710","7010","7310","9420"
])

function detectTopic(fx, text) {
  const t = String(text || "").toLowerCase()
  if (/зарплат|ish\s*haqi|oylik/.test(t)) return "payroll"
  if (/аренд/.test(t)) return "rent"
  if (/поставщик|6010/.test(t)) return "supplier"
  if (/ндс|qqs|6410/.test(t)) return "vat"
  if (/касс|5010/.test(t)) return "cash"
  if (/р\/с|банк|5110/.test(t)) return "bank"
  if (/аванс|4310/.test(t)) return "advance"
  return "generic"
}

function extractAccounts(text) {
  const set = new Set()
  const m = String(text || "").match(/\b\d{4}\b/g) || []
  for (const a of m) set.add(a)
  return Array.from(set)
}

function replaceForbiddenForPayroll(text) {
  let out = String(text || "")
  out = out.replace(/\b7010\b/g, "9420")
  out = out.replace(/\b2410\b/g, "6410")
  out = out.replace(/\b2420\b/g, "6520")
  out = out.replace(/\b1110\b/g, "5110")
  return out
}

function filterUnknownAccounts(text) {
  return String(text || "").replace(/(Дт|Кт)\s*(\d{4})/g, (_, dk, acc) => {
    if (KNOWN_ACCOUNTS.has(acc)) return `${dk} ${acc}`
    return `${dk} 0000`
  })
}

export function fixByTopic(text, topic) {
  let out = String(text || "")
  if (topic === "payroll") {
    out = replaceForbiddenForPayroll(out)
    if (!/\b6710\b/.test(out)) out = out.replace(/Проводки:\s*$/m, "Проводки:\n- Дт 2010 Кт 6710 - начисление, при необходимости 2310 2510 9420")
    if (!/\b6410\b/.test(out) && /ндфл|налог|12%/i.test(out)) {
      out = out.replace(/Проводки:\s*$/m, "Проводки:\n- Дт 6710 Кт 6410 - удержан НДФЛ 12%")
    }
  }
  out = filterUnknownAccounts(out)
  return out
}

export { detectTopic }
