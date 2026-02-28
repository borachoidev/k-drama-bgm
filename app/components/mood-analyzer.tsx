"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GENRES = [
  "로맨스",
  "멜로",
  "스릴러",
  "코미디",
  "사극",
  "미스터리",
  "일상",
  "판타지",
  "의학",
  "법정",
  "액션",
  "공포",
] as const;

type Genre = (typeof GENRES)[number];
type Phase = "idle" | "recording" | "analyzing" | "done";

const RECORD_DURATION_SEC = 10;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface MoodData {
  keywords: string[];
  bgColor: string;
}

async function fetchMood(base64: string, mimeType: string): Promise<MoodData> {
  const res = await fetch("/api/analyze-mood", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video: base64, mimeType }),
  });
  const text = await res.text();
  if (!text) throw new Error(`서버 응답 없음 (${res.status})`);
  let data: { error?: string; keywords?: string[]; bgColor?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`서버 응답 오류 (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error ?? `요청 실패 (${res.status})`);
  return {
    keywords: data.keywords ?? [],
    bgColor: data.bgColor ?? "#fafafa",
  };
}

interface MoodAnalyzerProps {
  onBgColorChange?: (color: string | null) => void;
}

export function MoodAnalyzer({ onBgColorChange }: MoodAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<Genre>("로맨스");
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(RECORD_DURATION_SEC);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch {
      setCameraError("카메라를 사용할 수 없습니다. 브라우저 권한을 확인해 주세요.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearCountdown();
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setIsCameraOn(false);
    setPhase("idle");
    setCountdown(RECORD_DURATION_SEC);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setKeywords([]);
    setError(null);
    onBgColorChange?.(null);
  }, [clearCountdown, recordedUrl, onBgColorChange]);

  const analyze = useCallback(
    async (blob: Blob) => {
      setPhase("analyzing");
      setError(null);
      try {
        const base64 = await blobToBase64(blob);
        const mimeType = blob.type || "video/webm";
        const result = await fetchMood(base64, mimeType);
        setKeywords(result.keywords);
        onBgColorChange?.(result.bgColor);
        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "분석 요청에 실패했습니다.");
        setPhase("done");
      }
    },
    [onBgColorChange]
  );

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    setError(null);
    setKeywords([]);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    onBgColorChange?.(null);

    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      clearCountdown();
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      analyze(blob);
    };

    recorder.start();
    setPhase("recording");
    setCountdown(RECORD_DURATION_SEC);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          recorder.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [recordedUrl, clearCountdown, analyze, onBgColorChange]);

  const retryRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setKeywords([]);
    setError(null);
    setPhase("idle");
    setCountdown(RECORD_DURATION_SEC);
    onBgColorChange?.(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [recordedUrl, onBgColorChange]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearCountdown();
    };
  }, [clearCountdown]);

  const showLivePreview = isCameraOn && phase !== "done";
  const showRecordedVideo = phase === "done" && recordedUrl;

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        분위기 분석
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        카메라로 10초 영상을 녹화하면 분위기를 분석합니다.
      </p>

      {/* Camera / Recorded video */}
      <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        {/* Live camera preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full rounded-xl object-cover ${showLivePreview ? "" : "hidden"}`}
        />

        {/* Recorded video playback */}
        {showRecordedVideo && (
          <video
            src={recordedUrl}
            controls
            playsInline
            className="h-full w-full rounded-xl object-cover"
          />
        )}

        {/* Camera off placeholder */}
        {!isCameraOn && (
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-col items-center gap-2 px-6 py-4 text-center"
          >
            <span className="text-4xl">📷</span>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              카메라 시작
            </span>
          </button>
        )}

        {/* Recording overlay */}
        {phase === "recording" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                녹화 중 {countdown}초
              </span>
            </div>
          </div>
        )}

        {/* Analyzing overlay */}
        {phase === "analyzing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-zinc-800 shadow-lg">
              분위기 분석 중…
            </span>
          </div>
        )}

        {/* Camera controls */}
        {isCameraOn && phase !== "recording" && phase !== "analyzing" && (
          <button
            type="button"
            onClick={stopCamera}
            className="absolute right-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            끄기
          </button>
        )}

        {/* Recording indicator */}
        {phase === "recording" && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white">REC</span>
          </div>
        )}
      </div>

      {cameraError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {cameraError}
        </p>
      )}

      {/* Genre selector */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          드라마 장르 선택
        </span>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              disabled={phase === "recording" || phase === "analyzing"}
              className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                selectedGenre === g
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {phase === "idle" && isCameraOn && (
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            녹화 시작 (10초)
          </button>
        )}
        {phase === "done" && (
          <button
            type="button"
            onClick={retryRecording}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            다시 녹화
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Results */}
      {keywords.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              선택된 장르
            </span>
            <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              {selectedGenre}
            </span>
          </div>
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
        </div>
      )}
    </div>
  );
}
