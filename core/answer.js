// core/answer.js
import { openai } from "../config/env.js"
import { normAccountsInText } from "../utils/helpers.js"

/**
 * Формирование ответа ассистента
 * 
 * @param {Object} params
 * @param {Object} params.fx  результат extractFields
 * @param {string} params.originalUserText исходный текст
 * @param {string} params.model  используемая модель
 * @param {boolean} params.useFileSearch подключать ли векторку
 * @param {string} params.vectorStoreId ID векторного стора
 */
export async function buildAnswer({ fx, originalUserText, model, useFileSearch, vectorStoreId }) {
  // Если данных мало → сразу возвращаем просьбу дать полную инфу
  if (fx.missing.length > 0) {
    return [
      "Для формирования проводок нужна полная информация.",
      "Проверьте и укажите:",
      `- Операцию (например: оплата, покупка, зарплата, аренда)`,
      `- Сумму и валюту`,
      `- Способ оплаты (касса 1010 или расчетный счет 1030/5110)`,
      `- НДС (есть 20% или без НДС)`,
      "",
      "⚠️ Опишите всё одним сообщением, тогда я смогу выдать проводки."
    ].join("\n")
  }

  // Если всё есть → готовим запрос к ИИ (с векторкой если включена)
  const userBlock = `
Операция: ${fx.operation}
Сумма: ${fx.amount} ${fx.currency}
Оплата: ${fx.payment_method}
НДС: ${fx.vat}

Найди и верни только бухгалтерские проводки по Плану счетов РУз.
Формат ответа:

Проводки:
- Дт XXXX Кт YYYY — пояснение (сумма в UZS если известна)

Проверьте:
- список моментов, которые нужно уточнить бухгалтеру
`.trim()

  const tools = useFileSearch ? [{ type: "file_search", vector_store_ids: [vectorStoreId] }] : []

  const r = await openai.responses.create({
    model,
    input: [
      { role: "system", content: "Ты бухгалтерский ассистент по проводкам РУз. Отвечай только проводками, никаких лишних пояснений." },
      { role: "user", content: userBlock }
    ],
    tools
  })

  let text = r?.output_text?.trim?.() || "Не удалось найти проводки, укажите подробнее."

  // Нормализация счетов до 4-значного формата
  text = normAccountsInText(text)

  return text
}
