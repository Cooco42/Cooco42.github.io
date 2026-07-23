/**
 * Netlify Function — Nono AI coach (Gemini).
 * Set GEMINI_API_KEY in Netlify Site settings → Environment variables.
 */

const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i)

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  if (!apiKey) {
    return json(503, {
      error: 'missing_key',
      message: 'Set GEMINI_API_KEY in Netlify environment variables.',
    })
  }

  let body = {}
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'bad_json' })
  }

  const system =
    (body.system ||
      'You are Gemini, a warm conversational AI inside a Nonogram puzzle app.') +
    (body.hint ? `\n\nOptional solver hint JSON: ${JSON.stringify(body.hint)}` : '')

  const history = (body.messages ?? [])
    .slice(-20)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: (m.content || m.text || '').trim(),
    }))
    .filter((m) => m.content)

  if (body.userText?.trim()) {
    history.push({ role: 'user', content: body.userText.trim() })
  }

  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const merged = []
  for (const turn of contents) {
    const last = merged[merged.length - 1]
    if (last && last.role === turn.role) {
      last.parts[0].text += `\n\n${turn.parts[0].text}`
    } else {
      merged.push({
        role: turn.role,
        parts: [{ text: turn.parts[0].text }],
      })
    }
  }
  if (merged[0]?.role === 'model') {
    merged.unshift({ role: 'user', parts: [{ text: 'Hi' }] })
  }

  try {
    let text = ''
    let usedModel = MODELS[0]
    let lastErr = ''
    for (const model of MODELS) {
      usedModel = model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: merged,
          generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
        }),
      })
      if (response.status === 429) {
        lastErr = 'quota'
        continue
      }
      if (!response.ok) {
        lastErr = await response.text()
        continue
      }
      const data = await response.json()
      text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('')
          .trim() ?? ''
      if (text) break
      lastErr = 'empty_reply'
    }

    if (!text) {
      if (lastErr === 'quota') {
        return json(429, {
          error: 'quota',
          message:
            'Gemini quota exceeded. Create a new key at aistudio.google.com/apikey or wait for reset.',
        })
      }
      return json(502, {
        error: 'upstream',
        message: String(lastErr).slice(0, 300) || 'No model responded',
      })
    }

    return json(200, { text, model: usedModel, provider: 'gemini' })
  } catch (error) {
    return json(500, {
      error: 'coach_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
    body: JSON.stringify(data),
  }
}
