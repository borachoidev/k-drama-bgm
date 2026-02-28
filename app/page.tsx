"use client";

import { useState, useRef } from "react";
import type { GenerationStatus, GenrePreset } from "@/lib/types";

const GENRE_PRESETS: GenrePreset[] = [
  { keyword: "사극", label: "사극" },
  { keyword: "로맨스", label: "로맨스" },
  { keyword: "스릴러", label: "스릴러" },
  { keyword: "판타지", label: "판타지" },
  { keyword: "코미디", label: "코미디" },
  { keyword: "멜로", label: "멜로" },
  { keyword: "액션", label: "액션" },
  { keyword: "일상", label: "일상" },
];

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate(selectedKeyword?: string) {
    const kw = selectedKeyword ?? keyword.trim();
    if (!kw) return;

    // Clean up previous audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setStatus("generating");
    setErrorMsg("");
    setActiveKeyword(kw);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate-bgm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStatus("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function handlePresetClick(presetKeyword: string) {
    setKeyword(presetKeyword);
    handleGenerate(presetKeyword);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            K-Drama BGM Generator
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            장르 키워드를 입력하면 AI가 한국 드라마 배경음악을 생성합니다
          </p>
        </div>

        {/* Genre Presets */}
        <div className="flex flex-wrap gap-2">
          {GENRE_PRESETS.map((preset) => (
            <button
              key={preset.keyword}
              onClick={() => handlePresetClick(preset.keyword)}
              disabled={status === "generating"}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input + Generate */}
        <div className="flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && status !== "generating") {
                handleGenerate();
              }
            }}
            placeholder="장르 키워드 입력 (예: 사극, 로맨스, 스릴러...)"
            disabled={status === "generating"}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={status === "generating" || !keyword.trim()}
            className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            생성
          </button>
        </div>

        {/* Status */}
        {status === "generating" && (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
            <div className="text-center">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                &ldquo;{activeKeyword}&rdquo; BGM 생성 중...
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                약 10초 정도 소요됩니다
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
            <p className="font-medium text-red-800 dark:text-red-200">
              생성 실패
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errorMsg}
            </p>
            <button
              onClick={() => handleGenerate(activeKeyword)}
              className="mt-3 text-sm font-medium text-red-700 underline hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Audio Player */}
        {status === "done" && audioUrl && (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              &ldquo;{activeKeyword}&rdquo; BGM
            </p>
            <audio controls src={audioUrl} className="w-full" />
            <a
              href={audioUrl}
              download={`kdrama-bgm-${activeKeyword}.wav`}
              className="self-start rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              WAV 다운로드
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
