// config/env.js
import "dotenv/config"
import OpenAI from "openai"

export const PORT = Number(process.env.PORT || 3000)
export const MODEL = String(process.env.OPENAI_MODEL || "gpt-4o-mini")
export const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || ""
export const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT || 50)

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })
