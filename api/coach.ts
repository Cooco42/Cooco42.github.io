/**
 * Vercel serverless coach — Google Gemini only.
 * Set GEMINI_API_KEY in Vercel environment variables.
 */
export default async function handler(
  req: {
    method?: string
    body?: {
      messages?: Array<{ role: string; text?: string; content?: string }>
      system?: string
      userText?: string
      hint?: unknown
    }
  },
  res: {
    status: (code: number) => { json: (data: unknown) => void }
  },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  const preferred = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
  const models = [
    preferred,
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i)

  if (!apiKey) {
    res.status(503).json({
      error: 'missing_key',
      message: 'Set GEMINI_API_KEY in Vercel environment variables.',
    })
    return
  }

  const body = req.body ?? {}
  const system =
    (body.system ||
      `You are Gemini, a warm conversational AI inside a Nonogram puzzle app — talk like ChatGPT.`) +
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

  try {
    let text = ''
    let usedModel = models[0]!
    let lastErr = ''
    for (const model of models) {
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
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
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
        res.status(429).json({
          error: 'quota',
          message:
            'Gemini quota exceeded. Create a new key at aistudio.google.com/apikey or wait for reset.',
        })
        return
      }
      res.status(502).json({
        error: 'upstream',
        message: lastErr.slice(0, 300) || 'No model responded',
      })
      return
    }
    res.status(200).json({ text, model: usedModel, provider: 'gemini' })
  } catch (error) {
    res.status(500).json({
      error: 'coach_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
