import { THEME_KEY } from "../state/session.js"

export function applyTheme(mode) {
  document.body.classList.toggle("theme-light", mode === "light")
  localStorage.setItem(THEME_KEY, mode)

  const themeToggle = document.getElementById("themeToggle")
  themeToggle.innerHTML =
    mode === "light"
      ? '<img src="images/night-mode.png" alt="Dark mode" width="20" height="20">'
      : '<img class="night-mode-to-light" src="images/brightness.png" alt="Light mode" width="20" height="20">'
}

// текущая тема
export function currentTheme() {
  return localStorage.getItem(THEME_KEY) || "dark"
}
