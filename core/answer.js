import { openai } from "../config/env.js"
import { htmlUnescape, normAccountsInText } from "../utils/helpers.js"
import { ensureHtmlStructure, stripEmDash } from "../utils/format.js"
import { detectTopic, fixByTopic } from "./validators.js"

const ANSWER_SYSTEM = `
Ты ассистент бухгалтер по Республике Узбекистан. Отвечай кратко и по делу, дружелюбно, но по делу.
Если вопрос про проводки, всегда возвращай HTML со структурой:
<h3>Проводка</h3>
<ul>
<li>Дт XXXX Кт YYYY - краткое пояснение и сумма в UZS если известна</li>
</ul>
<hr/>
<h3>Первичные документы</h3>
<ul>
<li>перечень документов</li>
</ul>
<hr/>
<h3>Налогообложение</h3>
<ul>
<li>кратко по НДС и особенностям</li>
</ul>
<hr/>
<h3>Проверьте</h3>
<ul>
<li>краткие пункты для уточнения</li>
</ul>
Не экранируй HTML теги. Возвращай сырые теги. Не используй длинное тире.
Правила по зарплате:
- Начисление: Дт 2010/2310/2510/9420 Кт 6710 по виду затрат
- Удержания: Дт 6710 Кт 6410 НДФЛ 12%
- Соцналог работодателя обычно 12% для небюджетных, 25% для бюджетных: Дт 2010/2310/2510/9420 Кт 6520
- Выплата: Дт 6710 Кт 5110 или Кт 5010
- Перечисления: Дт 6410 Кт 5110; Дт 6520 Кт 5110
- Запрещены 7010, 2410, 2420, 1110 в контексте зарплаты
Если данных мало, делай допущения в рамках Плана счетов РУз и явно укажи их в блоке Проверьте.
Вне проводок говори как бухгалтер РУз, мягко возвращая к теме учета.
`.trim()

function buildSearchTerms(fx, originalUserText) {
  const terms = []
  if (fx?.operation) terms.push(fx.operation)
  if (fx?.payment_method === "r/s") terms.push("расчетный счет", "5110")
  if (fx?.payment_method === "cash") terms.push("касса", "5010")
  if (fx?.vat === "20%") terms.push("НДС 20", "6410", "4410")
  if (fx?.vat === "none") terms.push("без НДС")
  const accs = (String(originalUserText || "").match(/\b\d{3,4}\b/g) || []).slice(0, 6)
  terms.push(...accs)
  return Array.from(new Set(terms.filter(Boolean))).slice(0, 10).join(", ")
}

function buildDialogueContext(session) {
  const msgs = (session?.messages || []).slice(-12)
  return msgs.map(m => ({ role: m.role, content: m.content })).filter(Boolean)
}

export async function buildAnswer({ fx, originalUserText, systemPrompt, model, useFileSearch, vectorStoreId, cls, session }) {
  const topic = detectTopic(fx, originalUserText)
  const searchTerms = buildSearchTerms(fx, originalUserText)
  const dialogue = buildDialogueContext(session)
  const sys = [ANSWER_SYSTEM, systemPrompt ? systemPrompt : ""].filter(Boolean).join("\n\n")

  if (!cls.is_about_provodki) {
    const soft = `
Ты бухгалтер РУз. Поддержи короткий диалог и мягко направь к вопросам учета и проводок. Отвечай 1-2 предложения.
Текущий вопрос: ${originalUserText}
`.trim()
    const r = await openai.responses.create({
      model,
      input: [{ role: "system", content: sys }, ...dialogue, { role: "user", content: soft }]
    })
    const raw = r?.output_text?.trim?.() || "Готов помочь с вашими вопросами по учету в РУз."
    return stripEmDash(raw)
  }

  const userBlock = `
Детали:
${JSON.stringify(fx, null, 2)}

Поисковые термы:
${searchTerms}

Сформируй ответ в HTML по структуре. Не экранируй теги. Если способ оплаты не указан, в блоке Проводка дай два <li>: сначала для р/с, затем для кассы. Сумму показывай как 1 000 000 UZS формат, если распознана. Только дефис -.
Исходный текст:
${originalUserText}
`.trim()

  const tools = useFileSearch ? [{ type: "file_search", vector_store_ids: [vectorStoreId] }] : []

  const r = await openai.responses.create({
    model,
    input: [{ role: "system", content: sys }, ...dialogue, { role: "user", content: userBlock }],
    tools
  })

  let text = r?.output_text?.trim?.() || "<h3>Проводка</h3><ul><li>Дт 0000 Кт 0000 - уточните детали</li></ul><hr/><h3>Первичные документы</h3><ul><li>договор, счет, платежный документ</li></ul><hr/><h3>Налогообложение</h3><ul><li>уточните ставку НДС</li></ul><hr/><h3>Проверьте</h3><ul><li>сумму, способ оплаты, наличие НДС</li></ul>"
  text = htmlUnescape(text)
  text = normAccountsInText(text)
  text = fixByTopic(text, topic)
  text = stripEmDash(text)
  text = ensureHtmlStructure(text)
  return text
}
