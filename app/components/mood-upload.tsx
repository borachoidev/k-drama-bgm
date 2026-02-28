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

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setError("Please select a video file (mp4, webm, etc.)");
        setFile(null);
        setPreview(null);
        return;
      }
      setFile(chosen);
      setPreview(URL.createObjectURL(chosen));
    },
    [preview]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files?.[0];
      if (!dropped) return;
      if (!dropped.type.startsWith("video/")) {
        setError("Please select a video file (mp4, webm, etc.)");
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
          throw new Error(`Invalid server response (${res.status})`);
        }
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setKeywords(data.keywords ?? []);
      setGenre(data.genre ?? null);
    } catch (err) {
      setKeywords([]);
      setGenre(null);
      setError(
        err instanceof Error ? err.message : "Mood analysis failed."
      );
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
    <div className="flex w-full flex-col gap-6">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
        Upload a Video
      </h2>
      <p className="text-sm text-[var(--muted)]">
        Upload a video and our AI will analyze the color tone, lighting,
        expressions, and composition to extract mood keywords.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="glass flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl p-6 transition-all hover:bg-white/[0.06]"
      >
        <input
          type="file"
          accept={VIDEO_ACCEPT}
          onChange={onFileChange}
          className="sr-only"
          id="mood-video"
        />
        <label
          htmlFor="mood-video"
          className="flex cursor-pointer flex-col items-center gap-3 text-center"
        >
          {preview ? (
            <>
              <video
                src={preview}
                controls
                className="max-h-48 max-w-full rounded-xl"
                muted
                playsInline
              />
              <span className="text-sm text-[var(--muted)]">
                Click to select a different video
              </span>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--accent)]"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                Drag a video here or click to browse
              </span>
              <span className="text-xs text-[var(--muted)]">
                mp4, webm (up to ~1 minute recommended)
              </span>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={analyze}
          disabled={!file || isLoading}
          className="flex-1 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isLoading ? "Analyzing..." : "Analyze Mood"}
        </button>
        {file && (
          <button
            type="button"
            onClick={clear}
            disabled={isLoading}
            className="rounded-xl glass-light px-5 py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:bg-white/8 disabled:opacity-30"
          >
            Clear
          </button>
        )}
      </div>

      {(keywords.length > 0 || genre) && (
        <div className="glass rounded-2xl p-5">
          <div className="flex flex-col gap-4">
            {genre && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                  Detected Genre
                </span>
                <span className="rounded-full bg-[var(--accent-warm)]/15 px-3 py-1 text-sm font-semibold text-[var(--accent-warm)]">
                  {genre}
                </span>
              </div>
            )}
            {keywords.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)]">
                  Detected Mood
                </span>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 text-sm text-[var(--accent)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
