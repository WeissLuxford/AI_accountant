import 'dotenv/config';
import fs from 'fs';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  const vs = await client.vectorStores.create({ name: 'buk_provodki_v1' });
  console.log('VECTOR_STORE_ID:', vs.id);

  const file = await client.files.create({
    file: fs.createReadStream('./data/provodki.jsonl'),
    purpose: 'assistants',
  });

  await client.vectorStores.files.create(vs.id, { file_id: file.id });
  console.log('OK. file_id:', file.id);
})();
