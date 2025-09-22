// server.js
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
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!process.env.OPENAI_API_KEY) {
  console.warn("Нет OPENAI_API_KEY в .env — сервер запустится, но /api/chat вернёт сообщение об ошибке.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

app.get("/api/ping", (_req, res) => res.status(200).json({ output: "pong" }));
app.post("/api/echo", (req, res) => res.status(200).json({ output: `echo: ${JSON.stringify(req.body)}` }));

const four = (a) => String(a || "").padStart(4, "0").slice(-4);
function parseAmount(text) {
  const t = String(text || "").toLowerCase().replace(/\s+/g, " ");
  const m2 = t.match(/(\d+(?:[.,]\d+)?)\s*(млн|mln|million|миллион|m)\b/);
  if (m2) {
    const base = Number(m2[1].replace(",", "."));
    if (!isNaN(base)) return Math.round(base * 1_000_000);
  }
  const m3 = t.match(/(\d+(?:[.,]\d+)?)\s*(тыс|тысяч|k|ming)\b/);
  if (m3) {
    const base = Number(m3[1].replace(",", "."));
    if (!isNaN(base)) return Math.round(base * 1_000);
  }
  const m1 = t.match(/(\d[\d\s.,]*)/);
  if (m1) {
    const num = Number(m1[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(num)) return Math.round(num);
  }
  return null;
}
function htmlUnescape(s) {
  if (!s) return s;
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
const GREET_RE = /^(?:\s*(?:привет|здравствуйте|салом|салом алейкум|ассалом|hello|hi)\s*!*\s*)$/i;
const INTRO =
  "Привет! Я ассистент-бухгалтер по проводкам РУз. Помогаю подобрать Дт/Кт, учесть НДС и документы.\n" +
  "Напишите свободно, как в жизни. Пример: «Оплатили поставщику 2 млн с р/с - какая проводка?»";

const sessions = new Map();
function getSession(sid) {
  if (!sessions.has(sid)) sessions.set(sid, { awaiting:false, need:[], fx:null, lastAt:Date.now() });
  return sessions.get(sid);
}
setInterval(() => {
  const ttl = 1000*60*60;
  const now = Date.now();
  for (const [k,v] of sessions) if (now - v.lastAt > ttl) sessions.delete(k);
}, 10*60*1000);

const REQUIRED_FIELDS = ["operation","amount","payment_method"];
function computeMissing(fx) {
  const miss = [];
  if (!fx?.operation || fx.operation.trim().length < 3) miss.push("operation");
  if (fx?.amount == null || isNaN(Number(fx.amount))) miss.push("amount");
  if (!fx?.payment_method || fx.payment_method === "unknown") miss.push("payment_method");
  return miss;
}

function patchFromShortReply(fx, text) {
  const t = String(text || "").toLowerCase();
  if (/касс/.test(t)) fx.payment_method = "cash";
  if (/(р\/с|расч|банк|перевод|плат[её]ж|uzcard|humo)/.test(t)) fx.payment_method = "r/s";
  const amt = parseAmount(t);
  if (amt !== null) fx.amount = amt;
  if (/(без\s*ндс|ндс\s*нет|qqs\s*yo'q)/.test(t)) fx.vat = "none";
  if (/ндс\s*20|20%\s*ндс|qqs\s*20/.test(t)) fx.vat = "20%";
  if (!fx.operation || fx.operation.trim().length < 3) {
    if (/поручител|гарант/.test(t)) fx.operation = "выплата долга поручителю";
    else if (/поставщик|оплатил|перечисл/.test(t)) fx.operation = "оплата поставщику";
    else if (/аренд(а|у)/.test(t)) fx.operation = "оплата аренды";
    else if (/зарплат|з\/п|ish\ *haqi/.test(t)) fx.operation = "выплата заработной платы";
    else if (/налог|ндс|qqs/.test(t)) fx.operation = "уплата налога/НДС";
    else if (/аванс/.test(t)) fx.operation = "выдача/закрытие аванса";
    else fx.operation = t.split(/\s+/).slice(0, 5).join(" ");
  }
  return fx;
}

const ANSWER_SYSTEM = `
Ты ассистент бухгалтер по Республике Узбекистан. Отвечай коротко и по делу.
Всегда давай проводки с четырьмя цифрами счетов.
Всегда возвращай ответ как HTML с секциями:
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
Если данных не хватает, сделай разумные допущения и выдай рабочий вариант сразу. Недостающее укажи в блоке Проверьте:
<hr/>
<h3>Проверьте</h3>
<ul>
<li>краткие пункты для уточнения</li>
</ul>
Не экранируй HTML теги. Возвращай сырые теги без &lt; и &gt;. Не используй длинное тире.
Если способ оплаты неизвестен, сначала вариант для р/с, затем для кассы, двумя пунктами в списке Проводка.
Работай только по Республике Узбекистан.
`.trim();

async function extractFields(userText) {
  const safeUserText = String(userText || "").slice(0, 4000);
  const r = await openai.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: "Извлекай поля из свободного RU/UZ текста. Терпим к ошибкам/жаргону. Ответ - ТОЛЬКО один JSON-объект." },
      { role: "user", content: `
Текст: ${safeUserText}

Верни ТОЛЬКО JSON со следующими полями:
{
  "operation": string,
  "amount": number|null,
  "currency": "UZS"|"USD"|"EUR"|"OTHER",
  "payment_method": "r/s"|"cash"|"unknown",
  "vat": "none"|"20%"|"unknown",
  "counterparty_role": string,
  "documents": string[],
  "notes": string,
  "is_about_provodki": boolean,
  "missing": string[]
}

Правила:
- Если валюта не указана - "UZS".
- Если про НДС ничего - "none".
- Если способ оплаты не понятен - "unknown".
- Верни ТОЛЬКО JSON, без текста снаружи.
` }
    ]
  });

  let obj;
  try { obj = JSON.parse(r.output_text); }
  catch {
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

  if (Array.isArray(obj.entries)) {
    obj.entries = obj.entries.map(e => ({ ...e, debit: four(e.debit), credit: four(e.credit) }));
  }

  const autoAmt = parseAmount(safeUserText);
  if (autoAmt !== null && (obj.amount == null || isNaN(Number(obj.amount)))) obj.amount = autoAmt;
  if (!obj.payment_method || obj.payment_method === "unknown") {
    const low = safeUserText.toLowerCase();
    if (/касс/.test(low)) obj.payment_method = "cash";
    else if (/(р\/с|расч|банк|перевод|плат[её]ж|uzcard|humo)/.test(low)) obj.payment_method = "r/s";
    else obj.payment_method = "unknown";
  }
  return obj;
}

async function answerWithVector(fx, originalUserText, systemPrompt) {
  const useFileSearch = typeof process.env.VECTOR_STORE_ID === "string" && process.env.VECTOR_STORE_ID.startsWith("vs_");
  const guard = [ANSWER_SYSTEM, systemPrompt ? ("\nДоп. правила проекта:\n" + systemPrompt) : ""].join("\n").trim();

  const input = [
    { role: "system", content: guard },
    { role: "user", content:
`Детали:
${JSON.stringify(fx, null, 2)}

Сформируй ответ в HTML как в инструкции. Разделы строго в порядке: Проводка, затем <hr/>, затем Первичные документы, затем <hr/>, затем Налогообложение, затем при необходимости <hr/> и блок Проверьте.
В списке Проводка каждый вариант отдельным <li>. Сумму показывай как 1 000 000 UZS если распознана. Не используй длинное тире, только дефис -.
Если payment_method unknown, в Проводка дай два <li>: сначала вариант для р/с, затем для кассы.
Если база не дала точного совпадения, сформируй типовой вариант и укажи это пунктом в разделе Проверьте.
Не экранируй теги. Верни сырые HTML теги без &lt; и &gt;.
Исходный текст:
${originalUserText}` }
  ];

  const r = await openai.responses.create({
    model: MODEL,
    input,
    tools: useFileSearch ? [{ type: "file_search", vector_store_ids: [process.env.VECTOR_STORE_ID] }] : []
  });

  let text = r?.output_text?.trim?.() || "Пустой ответ модели";
  text = htmlUnescape(text);
  text = text.replace(/Дт\s*(\d{1,4})\s*Кт\s*(\d{1,4})/gi, (_m, d, c) => `Дт ${four(d)} Кт ${four(c)}`);
  text = text.replace(/\u2014/g, "-");

  if (!useFileSearch) {
    text += "\n\nℹ️ Ответ без проверки по вашей базе (Vector Store). При необходимости верифицируйте формулировку на lex.uz.";
  }
  return text;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { systemPrompt, messages, sessionId } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ output: "⚠️ messages must be array" });
    }
    if (!openai.apiKey) {
      return res.status(200).json({ output: "⚠️ Отсутствует OPENAI_API_KEY на сервере" });
    }

    const sid = String(sessionId || req.ip);
    const sess = getSession(sid);
    sess.lastAt = Date.now();

    const lastUserText = (messages.slice().reverse().find(m => m.role === "user")?.content || "");

    if (GREET_RE.test(lastUserText)) {
      if (sess.awaiting && sess.need?.length) {
        const q = sess.need[0];
        const ask =
          (q === "payment_method") ? "Оплата была с расчётного счёта или из кассы?"
        : (q === "amount")         ? "Какова точная сумма операции?"
        :                             "Как кратко называется операция (например: «выплата долга поручителю»)?";
        return res.status(200).json({ output: `${INTRO}\n\nКстати, мы на шаге уточнений. ${ask}` });
      }
      return res.status(200).json({ output: INTRO });
    }

    if (sess.awaiting && sess.fx) {
      patchFromShortReply(sess.fx, lastUserText);
      const still = computeMissing(sess.fx);
      if (still.length === 0) {
        sess.awaiting = false;
        sess.need = [];
        const finalText = await answerWithVector(sess.fx, lastUserText, systemPrompt);
        return res.status(200).json({ output: finalText });
      } else {
        const q = still[0];
        const ask =
          (q === "payment_method") ? "Оплата была с расчётного счёта или из кассы?"
        : (q === "amount")         ? "Какова точная сумма операции?"
        :                             "Как кратко называется операция (например: «выплата долга поручителю»)?";
        sess.awaiting = true;
        sess.need = still;
        return res.status(200).json({ output: `Уточните, пожалуйста. ${ask}` });
      }
    }

    const fx = await extractFields(lastUserText);
    const missing = computeMissing(fx);

    if (missing.length) {
      const q = missing[0];
      const ask =
        (q === "payment_method") ? "Оплата была с расчётного счёта или из кассы?"
      : (q === "amount")         ? "Какова точная сумма операции?"
      :                             "Как кратко называется операция (например: «выплата долга поручителю»)?";
      sess.awaiting = true;
      sess.need = missing;
      sess.fx = fx;
      return res.status(200).json({ output: `Понял. ${ask}` });
    }

    sess.awaiting = false;
    sess.need = [];
    sess.fx = fx;

    const text = await answerWithVector(fx, lastUserText, systemPrompt);
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
