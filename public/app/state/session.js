// ключи для localStorage и настройки
export const API_URL = `${window.location.origin}/api/chat`
export const HISTORY_KEY = "chatHistory"
export const SYS_KEY = "systemPrompt"
export const THEME_KEY = "uiTheme"
export const LANG_KEY = "uiLang"
export const HISTORY_WINDOW = 16
export const SID_KEY = "chatSid"

// идентификатор сессии
export const SID =
  localStorage.getItem(SID_KEY) ||
  (crypto.randomUUID?.() || String(Date.now()))

localStorage.setItem(SID_KEY, SID)

// дефолтный системный промпт
export function defaultSystem() {
  return "Вы - внимательный, спокойный ассистент. Отвечайте кратко, структурировано, без выдумок."
}
