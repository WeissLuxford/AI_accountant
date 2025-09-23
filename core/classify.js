import { openai, MODEL } from "../config/env.js"

const RE_FINANCE = /(дт|кт|проводк|счет|счёт|оплат|перечисл|долг|аванс|ндс|qqs|аренд|поручител|зарплат|ish\s*haqi|oylik|касс|р\/с|узс|uzs|\b\d{4}\b)/i
const RE_REFINE = /^(да|нет|узс|uzs|касса|р\/с|без ндс|ндс 20|20%|есть|ок|хорошо|добавь|поправь|с р\/с|из кассы|\d[\d\s.,]*\s*(млн|mln|миллион|тыс|тысяч|ming)?|\d{4})$/i
const RE_SMALL = /^(как дела|привет|здравствуйте|салом|спасибо|ок|ага|ясно|понял|пока|до свидан|как ты|кто ты)/i

function shortText(s) {
  const t = String(s || "").trim()
  return t.length > 0 && t.length <= 40
}

function historyHint(sess) {
  const last = [...(sess?.messages || [])].slice(-4).map(m => `${m.role}:${m.content}`).join("\n")
  return last.slice(-1500)
}

export async function classifyMessage(text, sess) {
  const t = String(text || "").trim()
  if (RE_SMALL.test(t)) return { kind: "smalltalk", is_about_provodki: false }
  if (shortText(t) && RE_REFINE.test(t)) return { kind: "refine", is_about_provodki: RE_FINANCE.test(t) || RE_FINANCE.test(historyHint(sess)) }

  const heuristicAbout = RE_FINANCE.test(t)
  const prompt = `
Твоя задача классифицировать реплику.
Варианты kind: new, refine, meta, smalltalk.
Поле is_about_provodki: true если речь о бухгалтерских операциях, счетах, проводках по РУз, иначе false.

История:
${historyHint(sess)}

Текст:
${t}

Верни только JSON: {"kind":"new|refine|meta|smalltalk","is_about_provodki":true|false}
`.trim()

  try {
    const r = await openai.responses.create({
      model: MODEL,
      input: [{ role: "user", content: prompt }]
    })
    const obj = JSON.parse(r.output_text || "{}")
    const kind = typeof obj.kind === "string" ? obj.kind : "new"
    const about = typeof obj.is_about_provodki === "boolean" ? obj.is_about_provodki : heuristicAbout
    return { kind, is_about_provodki: about }
  } catch {
    return { kind: heuristicAbout ? "new" : "smalltalk", is_about_provodki: heuristicAbout }
  }
}
