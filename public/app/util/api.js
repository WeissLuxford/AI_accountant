import { API_URL, SYS_KEY, HISTORY_WINDOW, SID, defaultSystem } from "../state/session.js"
import { saveHistory } from "../state/history.js"
import { renderMessage, runStages } from "../ui/render.js"
import { stagesArr } from "../ui/i18n.js"
import { sanitize, unescapeHtml } from "./sanitize.js"

export async function onSend(text, history, setHistory) {
  if (!text) return history

  // сообщение пользователя
  const newHistory = history.concat({ role: "user", content: text })
  setHistory(newHistory)

  // плейсхолдер ассистента
  const placeholder = { role: "assistant", content: "" }
  const withPlaceholder = newHistory.concat(placeholder)
  saveHistory(withPlaceholder)
  renderMessage(placeholder)

  const bubbles = document.querySelectorAll(".msg.assistant .bubble")
  const bubble = bubbles[bubbles.length - 1]

  // стадии загрузки
  const stopStages = runStages(bubble, stagesArr())


  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: localStorage.getItem(SYS_KEY) || defaultSystem(),
        messages: withPlaceholder.slice(0, -1).slice(-HISTORY_WINDOW),
        sessionId: SID
      })
    })

    const raw = await resp.text()
    let answer = ""
    try {
      const data = JSON.parse(raw)
      answer = (data && data.output) ? data.output : "⚠️ Пустой JSON от сервера"
    } catch {
      answer = raw || "⚠️ Пустой текстовый ответ сервера"
    }

    stopStages()
    const html = unescapeHtml(answer)
    bubble.innerHTML = sanitize(html)

    const finalHistory = withPlaceholder.slice(0, -1).concat({ role: "assistant", content: html })
    saveHistory(finalHistory)
    setHistory(finalHistory)
    return finalHistory

  } catch (e) {
    stopStages()
    const err = `⚠️ Ошибка сети: ${e.message || e}`
    bubble.textContent = err

    const finalHistory = withPlaceholder.slice(0, -1).concat({ role: "assistant", content: err })
    saveHistory(finalHistory)
    setHistory(finalHistory)
    return finalHistory
  }
}
