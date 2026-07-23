import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

type ChatBody = {
  messages?: Array<{ role: string; text?: string; content?: string }>
  system?: string
  userText?: string
  hint?: unknown
}

type CoachError = Error & { status?: number }

async function readJson(req: IncomingMessage): Promise<ChatBody> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as ChatBody
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function buildHistory(body: ChatBody): Array<{ role: string; content: string }> {
  const history = (body.messages ?? [])
    .slice(-10)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.content || m.text || '').trim(),
    }))
    .filter((m) => m.content)

  if (body.userText?.trim()) {
    history.push({ role: 'user', content: body.userText.trim() })
  }
  return history
}

/** Prefer the fastest current models; 2.5 Flash is blocked for many new keys. */
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
]

async function callGemini(options: {
  apiKey: string
  model: string
  system: string
  messages: Array<{ role: string; content: string }>
}): Promise<{ text: string; model: string }> {
  const models = [options.model, ...GEMINI_MODELS].filter(
    (m, i, arr) => Boolean(m) && arr.indexOf(m) === i,
  )

  const errors: CoachError[] = []

  for (const model of models) {
    try {
      const text = await callGeminiOnce({ ...options, model })
      return { text, model }
    } catch (error) {
      const err =
        error instanceof Error
          ? (error as CoachError)
          : (new Error(String(error)) as CoachError)
      errors.push(err)
      if (err.status === 401 || err.status === 403) throw err
      // 404 = retired/unknown model → try next
      // 429 = quota → try next model, but remember it
      continue
    }
  }

  const quota = errors.find((e) => e.status === 429)
  throw quota ?? errors[errors.length - 1] ?? new Error('Gemini failed')
}

async function callGeminiOnce(options: {
  apiKey: string
  model: string
  system: string
  messages: Array<{ role: string; content: string }>
}): Promise<string> {
  const model = options.model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`

  const contents = options.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const merged: typeof contents = []
  for (const turn of contents) {
    const last = merged[merged.length - 1]
    if (last && last.role === turn.role) {
      last.parts[0]!.text += `\n\n${turn.parts[0]!.text}`
    } else {
      merged.push({
        role: turn.role,
        parts: [{ text: turn.parts[0]!.text }],
      })
    }
  }
  if (merged[0]?.role === 'model') {
    merged.unshift({ role: 'user', parts: [{ text: 'Hi' }] })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: merged,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    let friendly = `Gemini ${response.status}`
    try {
      const parsed = JSON.parse(errText) as {
        error?: { message?: string; status?: string }
      }
      const msg = parsed.error?.message || errText
      if (response.status === 429) {
        friendly =
          'Gemini quota exceeded for this Google account (all keys on the same account share one free limit). Use a different Google account at aistudio.google.com/apikey, enable billing, or wait until the daily quota resets.'
      } else {
        friendly = msg.slice(0, 280)
      }
    } catch {
      friendly = `${friendly}: ${errText.slice(0, 200)}`
    }
    const err = new Error(friendly) as CoachError
    err.status = response.status
    throw err
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('Gemini returned an empty reply')
  return text
}

/** Same-origin /api/coach — Google Gemini only. */
export function coachApiPlugin(): Plugin {
  return {
    name: 'nonogram-coach-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/coach') || req.method !== 'POST') {
          next()
          return
        }
        try {
          const body = await readJson(req)
          const apiKey = (process.env.GEMINI_API_KEY || '').trim()
          const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

          if (!apiKey) {
            sendJson(res, 503, {
              error: 'missing_key',
              message:
                'Add GEMINI_API_KEY to .env (free at aistudio.google.com/apikey), then restart npm run dev.',
            })
            return
          }

          const system =
            body.system ||
            `You are Nono Helper, a normal helpful AI assistant like ChatGPT.
Talk about anything. Be clear and natural. Prefer plain text over heavy markdown.`

          const result = await callGemini({
            apiKey,
            model,
            system,
            messages: buildHistory(body),
          })

          sendJson(res, 200, {
            text: result.text,
            model: result.model,
            provider: 'gemini',
          })
        } catch (error) {
          const status = (error as CoachError).status
          sendJson(res, status === 429 ? 429 : 500, {
            error: status === 429 ? 'quota' : 'coach_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })
    },
  }
}
