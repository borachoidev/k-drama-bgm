import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const MOOD_PROMPT = `Analyze this video and output ONLY the following JSON.

1) keywords: mood keywords (in English) reflecting these aspects:
- Color tone: overall color temperature, saturation, warmth/coolness
- Expression: emotions visible in facial expressions (if people are present)
- Composition: impression from framing and arrangement (stability, tension, etc.)

2) bgColor: a single hex color that best represents the overall mood of the video
- Use soft, low-saturation pastel or muted tones (suitable for UI background)

Output ONLY this JSON format, nothing else:
e.g: {"keywords": ["warm", "peaceful"], "bgColor": "#f5e6d3"}`

interface MoodResult {
  keywords: string[]
  bgColor: string
}

function parseMoodResult(text: string): MoodResult {
  const trimmed = text.trim()
  const jsonStr = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const parsed = JSON.parse(jsonStr) as unknown
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid response format')
  }
  const obj = parsed as Record<string, unknown>
  const keywords = Array.isArray(obj.keywords)
    ? (obj.keywords as unknown[]).filter(
        (x): x is string => typeof x === 'string'
      )
    : []
  const bgColor =
    typeof obj.bgColor === 'string' && /^#[0-9a-f]{6}$/i.test(obj.bgColor)
      ? obj.bgColor
      : '#fafafa'
  return { keywords, bgColor }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const body = (await request.json()) as { video?: string; mimeType?: string }
  const raw = body.video
  if (!raw || typeof raw !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid body.video (base64 string)' },
      { status: 400 }
    )
  }

  let base64Video: string
  let mimeType = 'video/webm'

  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:(video\/[a-z0-9+.]+);base64,(.+)$/i)
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid data URL for video' },
        { status: 400 }
      )
    }
    mimeType = match[1]
    base64Video = match[2]
  } else {
    base64Video = raw
    if (body.mimeType && typeof body.mimeType === 'string') {
      mimeType = body.mimeType
    }
  }

  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Video,
          },
        },
        { text: MOOD_PROMPT },
      ],
    })

    const text = response.text
    if (!text) {
      return NextResponse.json(
        { error: 'No text in Gemini response' },
        { status: 502 }
      )
    }

    const { keywords, bgColor } = parseMoodResult(text)
    return NextResponse.json({ keywords, bgColor })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('API key') ? 500 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
