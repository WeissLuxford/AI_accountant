import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const vs = process.env.VECTOR_STORE_ID
const dir = process.argv[2] || './data'

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

const names = fs.readdirSync(dir).filter(n => /\.(json|jsonl|txt|md|csv)$/i.test(n))
if (!names.length) { console.log('no files'); process.exit(0) }

const queue = names.slice()
const max = 2
let inFlight = 0
let done = 0
let failed = 0
const uploaded = []

async function uploadOne(name, attempt = 1) {
  try {
    const file = await client.files.create({ file: fs.createReadStream(path.join(dir, name)), purpose: 'assistants' })
    const linked = await client.vectorStores.files.create(vs, { file_id: file.id })
    uploaded.push({ name, id: linked.id })
    done++
    console.log('uploaded', `${done}/${names.length}`, name)
  } catch (e) {
    if (attempt < 4) {
      const backoff = 500 * attempt
      console.log('retry', attempt, name, e.message || String(e))
      await sleep(backoff)
      return uploadOne(name, attempt + 1)
    } else {
      failed++
      console.log('failed', name, e.message || String(e))
    }
  }
}

async function next() {
  if (!queue.length) return
  if (inFlight >= max) return
  const name = queue.shift()
  inFlight++
  await uploadOne(name)
  inFlight--
  await sleep(100)
  if (queue.length) await next()
}

const starters = Array.from({ length: max }, () => next())
await Promise.all(starters)

let total = 0
let after
while (true) {
  const page = await client.vectorStores.files.list(vs, { after, limit: 50 })
  total += (page.data || []).length
  if (!page.has_more) break
  after = page.last_id || page.data.at(-1)?.id
  if (!after) break
}

console.log('finished', done, 'of', names.length, 'failed', failed, 'linked_total', total)
