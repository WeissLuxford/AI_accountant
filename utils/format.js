// utils/format.js
export function ensureHtmlStructure(html) {
  const s = String(html || "").trim()
  if (s.startsWith("<h3>")) return s
  const body = s.replace(/[\r\n]+/g, " ").trim()
  return [
    "<h3>Ответ</h3>",
    "<ul>",
    `<li>${body}</li>`,
    "</ul>"
  ].join("")
}

export function stripEmDash(html) {
  return String(html || "").replace(/\u2014/g, "-").replace(/&mdash;/gi, "-")
}
