import { LANG_KEY } from "../state/session.js"

export const I18N = {
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
      "Собираем итоговый вывод..."
    ],
    welcomeTitle: "Добро пожаловать!",
    welcomeText: "Задайте вопрос по бухгалтерским проводкам.<br>Например: <em>«Оплатили поставщику 2 млн с р/с - какая проводка?»</em>",
    disclaimer: "⚠️ Ассистент может ошибаться. Всю информацию проверяйте самостоятельно перед использованием."
  
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
    welcomeText: "Buxgalteriya o'tkazmalari haqida savol bering.<br>Masalan: <em>«Yetkazib beruvchiga 2 mln r/s orqali to'ladik - qaysi o'tkazma?»</em>",
    disclaimer: "⚠️ Yordamchi xato qilishi mumkin. Ma'lumotni ishlatishdan oldin o'zingiz tekshiring."
 
  }
}

// текущий язык
export function currentLang() {
  return localStorage.getItem(LANG_KEY) || "ru"
}

// перевод строки
export function t(key) {
  const lang = currentLang()
  return (I18N[lang] || I18N.ru)[key]
}

// массив стадий
export function stagesArr() {
  const lang = currentLang()
  return (I18N[lang] || I18N.ru).stages
}

// применить язык ко всем элементам с data-i18n
export function applyLang(lang) {
  const dict = I18N[lang] || I18N.ru
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n")
    if (dict[key]) el.innerHTML = dict[key]
  })
  localStorage.setItem(LANG_KEY, lang)
  return dict
}
