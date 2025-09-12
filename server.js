import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

if (!process.env.OPENAI_API_KEY) {
  console.warn("Нет OPENAI_API_KEY в .env - сервер запустится, но /api/chat вернёт сообщение об ошибке.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get("/api/ping", (_req, res) => res.status(200).json({ output: "pong" }));
app.post("/api/echo", (req, res) => res.status(200).json({ output: `echo: ${JSON.stringify(req.body)}` }));

const sessions = new Map();
function getSession(sid) {
  if (!sessions.has(sid)) sessions.set(sid, { strikes: 0, awaiting: false, lastAt: Date.now() });
  return sessions.get(sid);
}

async function classifyTopic(text) {
  const prompt = `Текст: ${text}
Верни ТОЛЬКО JSON вида {"topic":"accounting"|"other","confidence":0..1}
"accounting" - если речь о бухучёте/проводках/счетах (Дт/Кт), налогах, НДС, актах, ОС, ТМЦ, аренде, расчётах и т.п.
Иначе "other".`;
  try {
    const r = await openai.responses.create({
      model: MODEL,
      input: [
        { role: "system", content: "Классифицируй кратко. Ответи только JSON." },
        { role: "user", content: prompt }
      ]
    });
    return JSON.parse(r.output_text);
  } catch {
    const hint = /дт|кт|дебет|кредит|проводк|сч[её]т|ндс|акт|накладн|лизинг|амортизац|аван|реализац|ос|тмц|касс|р\/с/i;
    return { topic: hint.test(text) ? "accounting" : "other", confidence: 0.5 };
  }
}

async function extractFields(userText) {
  const safeUserText = String(userText || "").slice(0, 4000);

  const r = await openai.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: "Извлекай поля из свободного RU/UZ текста. Терпим к ошибкам/жаргону. Отвечай ТОЛЬКО одним JSON-объектом." },
      { role: "user", content: `
Текст: ${safeUserText}

Верни ТОЛЬКО JSON со следующими полями:
{
  "operation": string,
  "amount": number|null,         // число без пробелов, если нет - null
  "currency": "UZS"|"USD"|"EUR"|"OTHER",
  "payment_method": "r/s"|"cash"|"unknown",
  "vat": "none"|"20%"|"unknown",
  "counterparty_role": string,   // "поручитель"/"поставщик"/"unknown" и т.п.
  "documents": string[],         // подсказки по документам (может быть пустым)
  "notes": string,               // краткая выжимка сути запроса
  "is_about_provodki": boolean,  // это про бухгалтерскую операцию/проводки?
  "missing": string[]            // какие ключевые поля не удалось понять (0–3 шт)
}

Правила:
- Если валюта не указана - ставь "UZS".
- Если про НДС ничего - ставь "none".
- Если способ оплаты не понятен - "unknown".
- Верни ТОЛЬКО один JSON-объект. Без пояснений вне JSON.
` }
    ]
  });

  let obj;
  try {
    obj = JSON.parse(r.output_text);
  } catch {
    obj = {
      operation: "",
      amount: null,
      currency: "UZS",
      payment_method: "unknown",
      vat: "none",
      counterparty_role: "unknown",
      documents: [],
      notes: safeUserText,
      is_about_provodki: true,
      missing: ["parse_error"]
    };
  }

  const hint = /дт|кт|дебет|кредит|проводк|счет|счёт|оплат|перечисл|долг|аванс|ндс|аренд|поручител|гарант|возврат/i;
  if (!obj.is_about_provodki && hint.test(safeUserText)) obj.is_about_provodki = true;

  console.log("extractFields →", obj);
  return obj;
}

const REQUIRED_FIELDS = ["operation","amount","payment_method"]; 

function computeMissing(fx) {
  const miss = [];
  if (!fx.operation || fx.operation.trim().length < 3) miss.push("operation");
  if (fx.amount == null || isNaN(Number(fx.amount))) miss.push("amount");
  if (!fx.payment_method || fx.payment_method === "unknown") miss.push("payment_method");
  return miss;
}

function patchFromShortReply(fx, text) {
  const t = String(text || "").toLowerCase();

  if (/касс/.test(t)) fx.payment_method = "cash";
  if (/(р\/с|расч|банк|перевод|плат[её]ж)/.test(t)) fx.payment_method = "r/s";

  const mSum = t.match(/([\d\s][\d\s.,]{2,})/);
  if (mSum) {
    const num = Number(mSum[1].replace(/\s/g,"").replace(",","."));
    if (!isNaN(num)) fx.amount = num;
  }

  if (/(без\s*ндс|ндс\s*нет)/.test(t)) fx.vat = "none";
  if (/ндс\s*20/.test(t) || /20%\s*ндс/.test(t)) fx.vat = "20%";

  if (!fx.operation || fx.operation.length < 3) {
    if (/поручител/.test(t) || /гарант/.test(t)) fx.operation = "выплата долга поручителю";
    if (/поставщик|оплатил|перечисл/.test(t)) fx.operation ||= "оплата поставщику";
  }

  return fx;
}


app.post("/api/chat", async (req, res) => {
  try {
    const { systemPrompt, messages } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ output: "⚠️ messages must be array" });
    }
    if (!openai.apiKey) {
      return res.status(200).json({ output: "⚠️ Отсутствует OPENAI_API_KEY на сервере" });
    }

    const lastUser = (messages.slice().reverse().find(m => m.role === "user")?.content || "");

    let fx = await extractFields(lastUser);

    const missing = [];
    if (!fx.operation || fx.operation.trim().length < 3) missing.push("operation");
    if (fx.amount == null || isNaN(Number(fx.amount))) missing.push("amount");
    if (!fx.payment_method || fx.payment_method === "unknown") missing.push("payment_method");

    const guardSystem = `
Ты ассистент по бухгалтерским проводкам (Узбекистан). Отвечай в рамках бухучёта: Дт/Кт, счета, НДС, документы.
Если каких-то данных не хватает, сделай аккуратные допущения и ЯВНО перечисли, что нужно подтвердить.
Формат: 
1) Кратко распознанная операция 
2) Проводки (по строкам: "Дт ХХХХ Кт YYYY - пояснение") 
3) Пояснения/варианты 
4) "Проверьте:" - список пунктов для подтверждения (из отсутствующих полей).
${systemPrompt ? ("\nДоп. правила:\n" + systemPrompt) : ""}
`.trim();
  
    const useFileSearch = typeof process.env.VECTOR_STORE_ID === "string" && process.env.VECTOR_STORE_ID.startsWith("vs_");

    const input = [
      { role: "system", content: guardSystem },
      { role: "user", content:
`Нормализованные данные (могут быть неполными):
${JSON.stringify(fx, null, 2)}

Исходный вопрос пользователя:
${lastUser}

Сформируй ответ в указанном формате. Если точных счетов нет в базе, дай типовой вариант и попроси подтвердить.` }
    ];

    const r = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input,
      tools: useFileSearch ? [{ type: "file_search", vector_store_ids: [process.env.VECTOR_STORE_ID] }] : []
    });

    let text = r?.output_text?.trim?.() || "Пустой ответ модели";

    const missingHints = {
      operation: "Коротко назовите операцию.",
      amount: "Укажите сумму.",
      payment_method: "Укажите способ оплаты: касса или р/с."
    };

    const tips = missing
      .filter(k => missingHints[k])
      .map(k => missingHints[k]);

    const notes = [];
    if (!useFileSearch) notes.push("Ответ без проверки по вашей базе (Vector Store).");
    if (tips.length) notes.push(tips.join(" "));
    if (notes.length) text += "\n\n" + notes.join(" ");

    return res.status(200).json({ output: text });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(200).json({ output: `⚠️ Ошибка сервера: ${err.message || String(err)}` });
  }
});


app.use("/api", (_req, res) => res.status(404).json({ output: "⚠️ Not found" }));

app.use(express.static(path.join(__dirname, "public"), { fallthrough: true }));

app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}`);
});
