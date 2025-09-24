export function parseAmount(text) {
  const t = String(text || "").toLowerCase().replace(/\s+/g, " ").trim()

  const mulNum = t.match(/(\d+(?:[.,]\d+)?)(?:\s*)?(млрд\.?|mlrd|миллиард|млн\.?|mln|million|миллион|тыс\.?|тысяч|ming|k|к)/)
  if (mulNum) {
    const base = Number(mulNum[1].replace(",", "."))
    if (!Number.isNaN(base)) {
      const unit = mulNum[2]
      const k =
        /(млрд\.?|mlrd|миллиард)/.test(unit) ? 1_000_000_000 :
        /(млн\.?|mln|million|миллион)/.test(unit) ? 1_000_000 :
        /(тыс\.?|тысяч|ming|k|к)/.test(unit) ? 1_000 : 1
      return Math.round(base * k)
    }
  }

  const shortUzs = t.match(/(\d+(?:[.,]\d+)?)(?:\s*)?(с|сум|so'm|сом|сўм)\b/)
  if (shortUzs) {
    const v = Number(shortUzs[1].replace(/\s/g, "").replace(",", "."))
    if (!Number.isNaN(v)) return v
  }

  const plain = t.match(/(\d[\d\s.,]*)/)
  if (plain) {
    const v = Number(plain[1].replace(/\s/g, "").replace(",", "."))
    if (!Number.isNaN(v)) return v
  }

  const RU_NUM = {
    "ноль":0,"один":1,"одна":1,"два":2,"две":2,"три":3,"четыре":4,"пять":5,"шесть":6,"семь":7,"восемь":8,"девять":9,"десять":10,
    "одиннадцать":11,"двенадцать":12,"тринадцать":13,"четырнадцать":14,"пятнадцать":15,"шестнадцать":16,"семнадцать":17,"восемнадцать":18,"девятнадцать":19,
    "двадцать":20,"тридцать":30,"сорок":40,"пятьдесят":50,"шестьдесят":60,"семьдесят":70,"восемьдесят":80,"девяносто":90,
    "сто":100,"двести":200,"триста":300,"четыреста":400,"пятьсот":500,"шестьсот":600,"семьсот":700,"восемьсот":800,"девятьсот":900
  }
  const UZ_NUM = {
    "bir":1,"ikki":2,"uch":3,"to'rt":"4","tort":4,"besh":5,"olti":6,"yetti":7,"sakkiz":8,"to'qqiz":9,"toqқiz":9,"o'n":10,"on":10,
    "yigirma":20,"o'ttiz":30,"ottiz":30,"qirq":40,"ellik":50,"oltmis":60,"oltmish":60,"yetmis":70,"yetmish":70,"sakson":80,"to'qson":90,"toqson":90,
    "yuz":100
  }
  const SCALE_WORD = {
    "тысяча":1_000,"тыс":1_000,"ming":1_000,
    "миллион":1_000_000,"млн":1_000_000,"million":1_000_000,
    "миллиард":1_000_000_000,"млрд":1_000_000_000,"mlrd":1_000_000_000
  }

  const ws = t.split(" ")
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]
    const nRu = RU_NUM[w]
    const nUz = UZ_NUM[w]
    const n = typeof nRu === "number" ? nRu : (typeof nUz === "number" ? nUz : null)
    if (n != null) {
      const next = ws[i + 1]
      if (next && SCALE_WORD[next]) return n * SCALE_WORD[next]
      return n
    }
    if (SCALE_WORD[w] && i > 0) {
      const prev = ws[i - 1]
      const pRu = RU_NUM[prev]
      const pUz = UZ_NUM[prev]
      const p = typeof pRu === "number" ? pRu : (typeof pUz === "number" ? pUz : null)
      if (p != null) return p * SCALE_WORD[w]
      return SCALE_WORD[w]
    }
  }

  return null
}
