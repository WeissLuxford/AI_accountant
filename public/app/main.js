import { defaultSystem, SYS_KEY, LANG_KEY, THEME_KEY } from "./state/session.js"
import { loadHistory, saveHistory, clearHistory as clearStored } from "./state/history.js"
import { I18N, applyLang } from "./ui/i18n.js"
import { applyTheme, currentTheme } from "./ui/theme.js"
import { renderAll } from "./ui/render.js"
import { onSend } from "./util/api.js"

let history = loadHistory()

// элементы DOM
const chatEl = document.getElementById("chat")
const inputEl = document.getElementById("input")
const sendBtn = document.getElementById("sendBtn")
const clearBtn = document.getElementById("clearBtn")
const sysPromptEl = document.getElementById("sysPrompt")
const saveSysBtn = document.getElementById("saveSys")
const themeToggle = document.getElementById("themeToggle")
const langSelect = document.getElementById("lang")

// инициализация языка и темы
const initialLang = localStorage.getItem(LANG_KEY) || "ru"
const initialTheme = localStorage.getItem(THEME_KEY) || "dark"
applyLang(initialLang)
applyTheme(initialTheme)

sysPromptEl.value = localStorage.getItem(SYS_KEY) || defaultSystem()
renderAll(history)

// события
sendBtn.addEventListener("click", () => handleSend())
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
})

clearBtn.addEventListener("click", () => {
  history = clearStored()
  renderAll(history)
})

saveSysBtn.addEventListener("click", () => {
  localStorage.setItem(SYS_KEY, sysPromptEl.value.trim())
})

themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("theme-light") ? "dark" : "light"
  applyTheme(next)
})

langSelect.addEventListener("change", () => {
  const dict = applyLang(langSelect.value)
  sendBtn.textContent = dict.send
  clearBtn.textContent = dict.clear
  saveSysBtn.textContent = dict.save
  inputEl.placeholder = dict.inputPh
  sysPromptEl.placeholder = dict.sysPh
  renderAll(history)
})

// обёртка для обновления истории
function setHistory(newHistory) {
  history = newHistory
  saveHistory(history)
  renderAll(history)
}

// обработчик отправки
async function handleSend() {
  const text = inputEl.value.trim()
  if (!text) return
  inputEl.value = ""
  history = await onSend(text, history, setHistory)
}
