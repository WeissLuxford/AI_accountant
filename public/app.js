const API_URL = `${window.location.origin}/api/chat`;
const HISTORY_KEY = "chatHistory";
const SYS_KEY = "systemPrompt";
const THEME_KEY = "uiTheme";
const LANG_KEY = "uiLang";
const HISTORY_WINDOW = 16;

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const sysPromptEl = document.getElementById("sysPrompt");
const saveSysBtn = document.getElementById("saveSys");
const themeToggle = document.getElementById("themeToggle");
const langSelect = document.getElementById("lang");

const SID_KEY = "chatSid";
const sid = localStorage.getItem(SID_KEY) || (crypto.randomUUID?.() || String(Date.now()));
localStorage.setItem(SID_KEY, sid);

const I18N = {
  ru: {
    you: "Вы",
    assistant: "Assistant",
    send: "Отправить",
    clear: "Очистить",
    save: "Сохранить промпт",
    inputPh: "Напишите ваш вопрос...",
    sysPh: "System prompt...",
    stages: [
      "Собираем данные...",
      "Анализируем запрос...",
      "Ищем подходящие проводки...",
      "Сверяем с нормативами...",
      "Проверяем счета и корреспонденции...",
      "Уточняем НДС и ставки...",
      "Анализируем документы...",
      "Сопоставляем с планом счетов...",
      "Готовим пояснения...",
      "Составляем ответ...",
      "Финализируем результат...",
      "Проводим быстрый контроль...",
      "Оптимизируем формулировки...",
      "Собираем итоговый вывод...",
    ],
    welcomeTitle: "Добро пожаловать!",
    welcomeText: "Задайте вопрос по бухгалтерским проводкам.<br>Например: <em>«Оплатили поставщику 2 млн с р/с — какая проводка?»</em>"
  
  },
  uz: {
    you: "Siz",
    assistant: "Yordamchi",
    send: "Yuborish",
    clear: "Tozalash",
    save: "Promptni saqlash",
    inputPh: "Savolingizni yozing...",
    sysPh: "System prompt...",
    stages: [
      "Ma'lumotlarni yig'moqdamiz...",
      "So'rovni tahlil qilmoqdamiz...",
      "Mos o'tkazmalarni izlamoqdamiz...",
      "Me'yorlar bilan solishtirmoqdamiz...",
      "Hisoblar va korrespondentsiyani tekshirmoqdamiz...",
      "QQS va stavkalarni aniqlashtirmoqdamiz...",
      "Hujjatlarni tahlil qilmoqdamiz...",
      "Hisoblar rejasiga moslashtirmoqdamiz...",
      "Izohlarni tayyorlamoqdamiz...",
      "Javobni tuzmoqdamiz...",
      "Natijani yakunlamoqdamiz...",
      "Tezkor nazoratdan o'tkazmoqdamiz...",
      "Iboralarni optimallashtirmoqdamiz...",
      "Yakuniy xulosani yig'moqdamiz..."
    ],
    welcomeTitle: "Xush kelibsiz!",
    welcomeText: "Buxgalteriya o'tkazmalari haqida savol bering.<br>Masalan: <em>«Yetkazib beruvchiga 2 mln r/s orqali to'ladik — qaysi o'tkazma?»</em>"
  
  }
};

function defaultSystem() {
  return "Вы - внимательный, спокойный ассистент. Отвечайте кратко, структурировано, без выдумок.";
}

let history = loadHistory();
const initialLang = localStorage.getItem(LANG_KEY) || "ru";
const initialTheme = localStorage.getItem(THEME_KEY) || "dark";
applyTheme(initialTheme);
applyLang(initialLang);

sysPromptEl.value = localStorage.getItem(SYS_KEY) || defaultSystem();
renderAll();

sendBtn.addEventListener("click", onSend);
clearBtn.addEventListener("click", clearHistory);
saveSysBtn.addEventListener("click", () => {
  localStorage.setItem(SYS_KEY, sysPromptEl.value.trim());
});
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
});
themeToggle.addEventListener("click", () => {
  const next = document.body.classList.contains("theme-light") ? "dark" : "light";
  applyTheme(next);
});
langSelect.addEventListener("change", () => applyLang(langSelect.value));

function applyTheme(mode) {
  document.body.classList.toggle("theme-light", mode === "light");
  localStorage.setItem(THEME_KEY, mode);
  themeToggle.innerHTML = mode === "light"
  ? '<img src="images/night-mode.png" alt="Dark mode" width="20" height="20">'
  : '<img class="night-mode-to-light"src="images/brightness.png" alt="Light mode" width="20" height="20">';
}

function applyLang(lang) {
  const dict = I18N[lang] || I18N.ru;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.innerHTML = dict[key];
  });

  langSelect.value = lang;
  
  sendBtn.textContent = dict.send;
  clearBtn.textContent = dict.clear;
  saveSysBtn.textContent = dict.save;
  inputEl.placeholder = dict.inputPh;
  sysPromptEl.placeholder = dict.sysPh;
  localStorage.setItem(LANG_KEY, lang);
  renderAll();
}

function t(key) {
  const lang = localStorage.getItem(LANG_KEY) || "ru";
  return (I18N[lang] || I18N.ru)[key];
}

function stagesArr() {
  const lang = localStorage.getItem(LANG_KEY) || "ru";
  return (I18N[lang] || I18N.ru).stages;
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addMessage(role, content) {
  history.push({ role, content });
  saveHistory();
  renderMessage({ role, content });
  autoscroll();
}

function renderAll() {
  chatEl.innerHTML = "";
  history.forEach(renderMessage);
  autoscroll(true);

  const welcomeEl = document.getElementById("welcome");
  if (history.length === 0) {
    welcomeEl.classList.remove("hidden");
  } else {
    welcomeEl.classList.add("hidden");
  }
}

function renderMessage(msg) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${msg.role}`;
  const role = document.createElement("div");
  role.className = "role";
  role.textContent = msg.role === "user" ? t("you") : t("assistant");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = msg.content || "";
  wrap.append(role, bubble);
  chatEl.appendChild(wrap);
}

function autoscroll(force) {
  if (force || (chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 200)) {
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}

function runStages(bubble, stages) {
  let i = 0;
  let active = true;
  function next() {
    if (!active) return;
    bubble.textContent = stages[i % stages.length];
    i++;
    const delay = 800 + Math.random() * 1700;
    setTimeout(next, delay);
  }
  next();
  return () => { active = false; };
}

async function onSend() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  addMessage("user", text);

  const placeholder = { role: "assistant", content: "" };
  history.push(placeholder);
  saveHistory();
  renderMessage(placeholder);
  autoscroll(true);

  const bubble = chatEl.lastElementChild.querySelector(".bubble");
  const stopStages = runStages(bubble, stagesArr());

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: localStorage.getItem(SYS_KEY) || defaultSystem(),
        messages: history.slice(0, -1).slice(-HISTORY_WINDOW),
        sessionId: sid
      })
    });

    const raw = await resp.text();
    let answer = "";
    try {
      const data = JSON.parse(raw);
      answer = (data && data.output) ? data.output : "⚠️ Пустой JSON от сервера";
    } catch {
      answer = raw || "⚠️ Пустой текстовый ответ сервера";
    }

    stopStages();
    bubble.textContent = answer;
    placeholder.content = answer;
    history[history.length - 1] = { role: "assistant", content: answer };
    saveHistory();

  } catch (e) {
    stopStages();
    const err = `⚠️ Ошибка сети: ${e.message || e}`;
    bubble.textContent = err;
    placeholder.content = err;
    history[history.length - 1] = { role: "assistant", content: err };
    saveHistory();
  }
}

function clearHistory() {
  history = [];
  saveHistory();
  renderAll();
}
