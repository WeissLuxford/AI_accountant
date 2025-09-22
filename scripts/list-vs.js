import 'dotenv/config'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const vs = process.env.VECTOR_STORE_ID

let after
let total = 0
const out = []

while (true) {
  const page = await client.vectorStores.files.list(vs, { after, limit: 50 })
  const { data = [], has_more } = page
  total += data.length
  out.push(...data.map(f => ({ id: f.id, bytes: f.usage_bytes, status: f.status })))
  console.log(`page ${out.length ? Math.ceil(total / 50) : 1}: +${data.length}, total ${total}, has_more=${!!has_more}`)
  if (!has_more || data.length === 0) break
  after = page.last_id || data[data.length - 1]?.id
  if (!after) break
}

console.log(JSON.stringify({ total, files: out }, null, 2))
