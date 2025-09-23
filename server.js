import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { openai, PORT, MODEL, VECTOR_STORE_ID, HISTORY_LIMIT } from "./config/env.js"
import { getSession, pushMessages, trimHistory, touchSession } from "./core/sessions.js"
import { classifyMessage } from "./core/classify.js"
import { extractFields, patchFromShortReply } from "./core/extract.js"
import { buildAnswer } from "./core/answer.js"

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(cors({ origin: true }))
app.use(express.json({ limit: "1mb" }))
app.use((req, _res, next) => { console.log(req.method, req.url); next() })

const GREET_RE = /^(?:\s*(?:привет|здравствуйте|салом|салом алейкум|ассалом|hello|hi)\s*!*\s*)$/i
const INTRO = "Привет. Я бухгалтерский ассистент по РУз. Помогаю с проводками, НДС и документами. Сформулируйте задачу простыми словами."

app.get("/api/ping", (_req, res) => res.status(200).json({ output: "pong" }))
app.post("/api/echo", (req, res) => res.status(200).json({ output: `echo: ${JSON.stringify(req.body)}` }))

app.post("/api/chat", async (req, res) => {
  try {
    const { systemPrompt, messages, sessionId } = req.body || {}
    if (!Array.isArray(messages)) return res.status(400).json({ output: "⚠️ messages must be array" })
    if (!openai.apiKey) return res.status(200).json({ output: "⚠️ Отсутствует OPENAI_API_KEY на сервере" })

    const sid = String(sessionId || req.ip)
    const sess = getSession(sid)
    touchSession(sess)
    pushMessages(sess, messages)
    trimHistory(sess, HISTORY_LIMIT)

    const lastUserText = String(messages.slice().reverse().find(m => m.role === "user")?.content || "")
    if (GREET_RE.test(lastUserText)) return res.status(200).json({ output: INTRO })

    const cls = await classifyMessage(lastUserText, sess)
    let fx
    if (cls.kind === "refine" && sess.state?.fx) fx = patchFromShortReply(sess.state.fx, lastUserText)
    else fx = await extractFields(lastUserText)
    sess.state = { ...(sess.state || {}), fx }

    const useFileSearch = Boolean(VECTOR_STORE_ID && VECTOR_STORE_ID.startsWith("vs_") && cls.is_about_provodki)
    const html = await buildAnswer({
      fx,
      originalUserText: lastUserText,
      systemPrompt: String(systemPrompt || ""),
      model: MODEL,
      useFileSearch,
      vectorStoreId: VECTOR_STORE_ID,
      cls,
      session: sess
    })

    sess.messages.push({ role: "assistant", content: html })
    trimHistory(sess, HISTORY_LIMIT)
    return res.status(200).json({ output: html })
  } catch (err) {
    console.error("API ERROR:", err)
    return res.status(200).json({ output: `⚠️ Ошибка сервера: ${err.message || String(err)}` })
  }
})

app.use("/api", (_req, res) => res.status(404).json({ output: "⚠️ Not found" }))
app.use(express.static(path.join(__dirname, "public"), { fallthrough: true }))

app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}`)
})
