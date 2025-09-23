import { t } from "./i18n.js"
import { unescapeHtml, sanitize } from "../util/sanitize.js"

// контейнер для чата
const chatEl = document.getElementById("chat")

export function renderAll(history) {
  chatEl.innerHTML = ""
  history.forEach(renderMessage)
  autoscroll(true)

  if (history.length === 0) {
    document.getElementById("welcome").classList.remove("hidden")
  } else {
    document.getElementById("welcome").classList.add("hidden")
  }
}

export function renderMessage(msg) {
  const wrap = document.createElement("div")
  wrap.className = `msg ${msg.role}`

  const role = document.createElement("div")
  role.className = "role"
  role.textContent = msg.role === "user" ? t("you") : t("assistant")

  const bubble = document.createElement("div")
  bubble.className = "bubble"

  if (msg.role === "assistant") {
    bubble.innerHTML = sanitize(unescapeHtml(msg.content || ""))
  } else {
    bubble.textContent = msg.content || ""
  }

  wrap.append(role, bubble)
  chatEl.appendChild(wrap)
}

export function autoscroll(force) {
  if (force || (chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 200)) {
    chatEl.scrollTop = chatEl.scrollHeight
  }
}

export function runStages(bubble, stages) {
  let i = 0
  let active = true
  function next() {
    if (!active) return
    bubble.textContent = stages[i % stages.length]
    i++
    autoscroll(true)             
    const delay = 800 + Math.random() * 1700
    setTimeout(next, delay)
  }
  next()
  return () => { active = false }
}
