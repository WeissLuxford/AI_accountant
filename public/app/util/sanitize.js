// убрать html-escape сущности (&lt;, &gt; и т.п.)
export function unescapeHtml(s) {
  return String(s || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

// санитизация html (убираем опасные вещи)
export function sanitize(html) {
  let s = String(html || "")
  s = s.replace(/<\s*script/gi, "&lt;script")
  s = s.replace(/on\w+\s*=/gi, "")
  s = s.replace(/javascript:/gi, "")
  return s
}
