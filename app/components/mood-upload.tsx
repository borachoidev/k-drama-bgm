"use client";

import { useCallback, useState } from "react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-msvideo";

export function MoodUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [genre, setGenre] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    setError(null);
    setKeywords([]);
    setGenre(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!chosen) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!chosen.type.startsWith("video/")) {
      setError("동영상 파일만 선택해 주세요. (mp4, webm 등)");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }, [preview]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files?.[0];
      if (!dropped) return;
      if (!dropped.type.startsWith("video/")) {
        setError("동영상 파일만 선택해 주세요. (mp4, webm 등)");
        return;
      }
      setError(null);
      setKeywords([]);
      setGenre(null);
      if (preview) URL.revokeObjectURL(preview);
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
    },
    [preview]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const analyze = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/analyze-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: base64,
          mimeType: file.type || "video/mp4",
        }),
      });
      const text = await res.text();
      let data: { error?: string; keywords?: string[]; genre?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`서버 응답 오류 (${res.status})`);
        }
      }
      if (!res.ok) {
        throw new Error(data.error ?? `요청 실패 (${res.status})`);
      }
      setKeywords(data.keywords ?? []);
      setGenre(data.genre ?? null);
    } catch (err) {
      setKeywords([]);
      setGenre(null);
      setError(err instanceof Error ? err.message : "분석 요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const clear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setKeywords([]);
    setGenre(null);
    setError(null);
  }, [preview]);

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        분위기 분석
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        동영상을 올리면 색감, 조명, 표정, 구도를 보고 분위기 키워드를 추출해요.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 transition-colors hover:border-zinc-400 hover:bg-zinc-100/50 dark:border-zinc-600 dark:bg-zinc-900/30 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50"
      >
        <input
          type="file"
          accept={VIDEO_ACCEPT}
          onChange={onFileChange}
          className="sr-only"
          id="mood-video"
        />
        <label htmlFor="mood-video" className="flex cursor-pointer flex-col items-center gap-2 text-center">
          {preview ? (
            <>
              <video
                src={preview}
                controls
                className="max-h-48 max-w-full rounded-lg"
                muted
                playsInline
              />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                클릭해서 다른 동영상 선택
              </span>
            </>
          ) : (
            <>
              <span className="text-5xl text-zinc-400 dark:text-zinc-500">↑</span>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                동영상을 드래그하거나 클릭해서 선택
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                mp4, webm (최대 약 1분 권장)
              </span>
            </>
          )}
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={analyze}
          disabled={!file || isLoading}
          className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isLoading ? "분석 중…" : "분위기 분석"}
        </button>
        {file && (
          <button
            type="button"
            onClick={clear}
            disabled={isLoading}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            지우기
          </button>
        )}
      </div>

      {(keywords.length > 0 || genre) && (
        <div className="flex flex-col gap-4">
          {genre && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                추측된 드라마 장르
              </span>
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                {genre}
              </span>
            </div>
          )}
          {keywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                추출된 키워드
              </span>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-zinc-200 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
