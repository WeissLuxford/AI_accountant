// utils/parse.js

export function parseAmount(text) {
  const t = String(text || "").toLowerCase()

  const mMul = t.match(/(\d+(?:[.,]\d+)?)\s*(млн|mln|миллион|тыс|тысяч|ming)/)
  if (mMul) {
    const base = Number(mMul[1].replace(",", "."))
    if (!isNaN(base)) {
      const unit = mMul[2]
      const k =
        /млн|mln|миллион/.test(unit) ? 1_000_000 :
        /тыс|тысяч|ming/.test(unit) ? 1_000 : 1
      return Math.round(base * k)
    }
  }

  const mNum = t.match(/(\d[\d\s.,]*)/)
  if (mNum) {
    const num = Number(mNum[1].replace(/\s/g, "").replace(",", "."))
    if (!isNaN(num)) return num
  }

  return null
}
