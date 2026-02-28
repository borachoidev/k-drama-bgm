import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getPromptConfig } from "@/lib/keyword-prompts";
import { encodeWav } from "@/lib/wav-encoder";

export const runtime = "nodejs";
export const maxDuration = 60;

const SAMPLE_RATE = 48000;
const COLLECT_SECONDS = 10;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let keyword: string;
  try {
    const body = await request.json();
    keyword = body.keyword;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!keyword || typeof keyword !== "string") {
    return NextResponse.json(
      { error: "keyword is required" },
      { status: 400 },
    );
  }

  const config = getPromptConfig(keyword);

  const client = new GoogleGenAI({
    apiKey,
    apiVersion: "v1alpha",
  });

  const chunks: Buffer[] = [];
  let resolveAudio: (wav: Buffer) => void;
  let rejectAudio: (err: Error) => void;

  const audioPromise = new Promise<Buffer>((resolve, reject) => {
    resolveAudio = resolve;
    rejectAudio = reject;
  });

  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const session = await client.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message) => {
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              if (chunk.data) {
                const audioBuffer = Buffer.from(chunk.data, "base64");
                chunks.push(audioBuffer);
              }
            }
          }
        },
        onerror: (e: ErrorEvent) => {
          rejectAudio!(new Error(e.message || "WebSocket error"));
        },
        onclose: () => {
          if (timer) clearTimeout(timer);
          const pcm = Buffer.concat(chunks);
          const wav = encodeWav(pcm, SAMPLE_RATE, 2, 16);
          resolveAudio!(wav);
        },
      },
    });

    await session.setWeightedPrompts({
      weightedPrompts: [{ text: config.prompt, weight: 1.0 }],
    });

    await session.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm: config.bpm,
        temperature: 1.0,
        brightness: config.brightness,
        density: config.density,
        guidance: 4.0,
      },
    });

    await session.play();

    // Collect audio for COLLECT_SECONDS, then stop
    timer = setTimeout(async () => {
      try {
        await session.pause();
        // Give a short grace period for final chunks to arrive
        setTimeout(() => {
          const pcm = Buffer.concat(chunks);
          const wav = encodeWav(pcm, SAMPLE_RATE, 2, 16);
          resolveAudio!(wav);
        }, 1000);
      } catch (err) {
        rejectAudio!(
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }, COLLECT_SECONDS * 1000);

    const wav = await audioPromise;

    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="kdrama-bgm.wav"; filename*=UTF-8''${encodeURIComponent(`kdrama-bgm-${keyword}.wav`)}`,
      },
    });
  } catch (err) {
    console.error("BGM generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `BGM generation failed: ${message}` },
      { status: 500 },
    );
  }
}
