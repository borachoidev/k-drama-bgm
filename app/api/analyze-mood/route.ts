import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const MOOD_PROMPT = `이 동영상을 분석해서 다음 두 가지를 JSON으로만 출력해줘.

1) 분위기 키워드 (다음 네 가지 반영):
- 색감: 전체적인 색 톤, 채도, 따뜻함/차가움
- 조명: 밝기, 방향, 부드러움/드라마틱함
- 표정: 인물이 있다면 표정에서 읽히는 감정
- 구도: 배치·구도에서 오는 인상 (안정감, 긴장감 등)

2) 드라마 장르 추측: 이 장면이 어떤 드라마 장르의 한 장면일지 가장 적합한 것 하나를 추측해줘. (예: 로맨스, 멜로, 스릴러, 코미디, 사극, 미스터리, 일상, 판타지, 의학, 법정 등)

반드시 아래 형식의 JSON 하나만 출력해줘. 다른 설명 없이.
{"keywords": ["따뜻한", "편안한", "실내"], "genre": "로맨스"}`;

interface MoodResult {
  keywords: string[];
  genre: string;
}

function parseMoodResult(text: string): MoodResult {
  const trimmed = text.trim();
  const jsonStr = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(jsonStr) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid response format");
  }
  const obj = parsed as Record<string, unknown>;
  const keywords = Array.isArray(obj.keywords)
    ? (obj.keywords as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const genre = typeof obj.genre === "string" ? obj.genre : "";
  return { keywords, genre };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let base64Media: string;
  let mimeType = "video/mp4";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { video?: string; mimeType?: string };
    const raw = body.video;
    if (!raw || typeof raw !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid body.video (base64 string)" },
        { status: 400 }
      );
    }
    // Allow data URL: data:video/mp4;base64,xxxx
    if (raw.startsWith("data:")) {
      const match = raw.match(/^data:(video\/[a-z0-9+.]+);base64,(.+)$/i);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid data URL for video" },
          { status: 400 }
        );
      }
      mimeType = match[1];
      base64Media = match[2];
    } else {
      base64Media = raw;
      if (body.mimeType && typeof body.mimeType === "string") {
        mimeType = body.mimeType;
      }
    }
  } else if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("video") ?? formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing form field: video or file" },
        { status: 400 }
      );
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Video file only (mp4, webm, etc.)" },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    base64Media = buffer.toString("base64");
    mimeType = file.type || "video/mp4";
  } else {
    return NextResponse.json(
      { error: "Content-Type must be application/json or multipart/form-data" },
      { status: 400 }
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Media,
          },
        },
        { text: MOOD_PROMPT },
      ],
    });

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "No text in Gemini response" },
        { status: 502 }
      );
    }

    const { keywords, genre } = parseMoodResult(text);
    return NextResponse.json({ keywords, genre });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("API key") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
