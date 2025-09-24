export const four = a => String(a || "").padStart(4, "0").slice(-4)

export function htmlUnescape(s) {
  if (!s) return s
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

export function clamp(n, a, b) {
  const x = Number(n)
  if (Number.isNaN(x)) return a
  return Math.max(a, Math.min(b, x))
}

export function pick(v, allowed, fallback) {
  return allowed.includes(v) ? v : fallback
}

export function uniq(arr) {
  return Array.from(new Set(arr || []))
}

export function hasAny(str, regs) {
  const s = String(str || "")
  return regs.some(r => r.test(s))
}

export function normAccountsInText(text) {
  return String(text || "")
    .replace(/Дт\s*(\d{1,4})\s*Кт\s*(\d{1,4})/gi, (_m, d, c) => `Дт ${four(d)} Кт ${four(c)}`)
    .replace(/\u2014/g, "-")
}

// перенос stripEmDash сюда
export function stripEmDash(text) {
  return String(text || "")
    .replace(/\u2014/g, "-")
    .replace(/&mdash;/gi, "-")
}
