// server.js
import express from "express"
import path from "path"
import { fileURLToPath } from "url"
import { classifyMessage } from "./core/classify.js"
import { extractFields } from "./core/extract.js"
import { buildAnswer } from "./core/answer.js"
import { MODEL, VECTOR_STORE_ID, USE_FILE_SEARCH } from "./config/env.js"

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// healthcheck
app.get("/ping", (_, res) => res.json({ ok: true }))

app.post("/api/chat", async (req, res) => {
  try {
    const userText = String(req.body?.messages?.slice(-1)[0]?.content || "").trim()
    if (!userText) {
      return res.json({ output: "⚠️ Введите текст запроса." })
    }

    // классификация: это вообще про проводки?
    const cls = classifyMessage(userText)

    if (!cls.is_about_provodki) {
      return res.json({
        output: "Я ассистент по проводкам. Отвечаю только на вопросы по проводкам. Опишите операцию полностью одним сообщением."
      })
    }

    // извлекаем поля
    const fx = await extractFields(userText)

    // если данных мало или всё ок → строим ответ
    const answer = await buildAnswer({
      fx,
      originalUserText: userText,
      model: MODEL,
      useFileSearch: !!VECTOR_STORE_ID && USE_FILE_SEARCH,
      vectorStoreId: VECTOR_STORE_ID
    })

    res.json({ output: answer })
  } catch (err) {
    console.error("API ERROR:", err)
    res.status(500).json({ output: `⚠️ Ошибка сервера: ${err.message || err}` })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✔ Server running on http://localhost:${PORT}`)
})
