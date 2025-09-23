import { HISTORY_KEY } from "./session.js"

// загрузка истории из localStorage
export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

// сохранение истории
export function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

// очистка истории
export function clearHistory() {
  localStorage.setItem(HISTORY_KEY, "[]")
  return []
}

// добавление нового сообщения
export function addMessage(history, role, content) {
  const updated = history.concat({ role, content })
  saveHistory(updated)
  return updated
}
