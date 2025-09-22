// scripts/clear-vs.js
import 'dotenv/config'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const vs = process.env.VECTOR_STORE_ID

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

let total = 0
let after
let iter = 0

while (true) {
  iter++
  const page = await client.vectorStores.files.list(vs, { after, limit: 40 })
  const data = page.data || []
  if (!data.length) break

  const ids = data.map(f => f.id)
  for (const id of ids) {
    await client.vectorStores.files.del(vs, id)
    total++
    if (total % 10 === 0) console.log('deleted', total)
    await sleep(50)
  }

  if (!page.has_more) break
  after = page.last_id || data[data.length - 1]?.id
  if (!after) break
  if (iter > 200) break
}

console.log('done', total)
