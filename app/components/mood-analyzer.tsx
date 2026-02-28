'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeVideoAndAudio } from '@/lib/merge-video';

const GENRES = [
  'Romance',
  'Melodrama',
  'Thriller',
  'Comedy',
  'Historical',
  'Mystery',
  'Slice of Life',
  'Fantasy',
  'Medical',
  'Legal',
  'Action',
  'Horror',
] as const;

type Genre = (typeof GENRES)[number];
type Phase = 'idle' | 'recording' | 'analyzing' | 'done' | 'generating';

const RECORD_DURATION_SEC = 10;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 ?? '');
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
  const res = await fetch('/api/analyze-mood', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video: base64, mimeType }),
  });
  const text = await res.text();
  if (!text) throw new Error(`Empty server response (${res.status})`);
  let data: { error?: string; keywords?: string[]; bgColor?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return {
    keywords: data.keywords ?? [],
    bgColor: data.bgColor ?? '#fafafa',
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
  const [selectedGenre, setSelectedGenre] = useState<Genre>('Romance');
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(RECORD_DURATION_SEC);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGeneratingBgm, setIsGeneratingBgm] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);

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
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch {
      setCameraError(
        'Unable to access camera. Please check your browser permissions.',
      );
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
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setIsCameraOn(false);
    setPhase('idle');
    setCountdown(RECORD_DURATION_SEC);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setKeywords([]);
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsGeneratingBgm(false);
    setMergedUrl(null);
    setIsMerging(false);
    setMergeProgress(0);
    onBgColorChange?.(null);
  }, [clearCountdown, recordedUrl, audioUrl, mergedUrl, onBgColorChange]);

  const generateBgm = useCallback(
    async (moodKeywords: string[], genre?: string) => {
      setIsGeneratingBgm(true);
      setPhase('generating');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      try {
        const res = await fetch('/api/generate-bgm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: moodKeywords, genre }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as { error?: string }).error ??
              `BGM generation failed (${res.status})`,
          );
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setPhase('done');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to generate BGM.',
        );
        setPhase('done');
      } finally {
        setIsGeneratingBgm(false);
      }
    },
    [audioUrl],
  );

  const analyze = useCallback(
    async (blob: Blob) => {
      setPhase('analyzing');
      setError(null);
      try {
        const base64 = await blobToBase64(blob);
        const mimeType = blob.type || 'video/webm';
        const result = await fetchMood(base64, mimeType);
        setKeywords(result.keywords);
        onBgColorChange?.(result.bgColor);
        setPhase('done');
        if (result.keywords.length > 0) {
          generateBgm(result.keywords, selectedGenre);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Mood analysis failed.');
        setPhase('done');
      }
    },
    [onBgColorChange, generateBgm, selectedGenre],
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
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
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
    setPhase('recording');
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
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setKeywords([]);
    setError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsGeneratingBgm(false);
    setMergedUrl(null);
    setIsMerging(false);
    setMergeProgress(0);
    setPhase('idle');
    setCountdown(RECORD_DURATION_SEC);
    onBgColorChange?.(null);
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [recordedUrl, audioUrl, mergedUrl, onBgColorChange]);

  const handleMerge = useCallback(async () => {
    if (!recordedBlob || !audioBlob) return;
    setIsMerging(true);
    setMergeProgress(0);
    setError(null);
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setMergedUrl(null);
    try {
      const merged = await mergeVideoAndAudio(
        recordedBlob,
        audioBlob,
        (ratio) => setMergeProgress(Math.round(ratio * 100)),
      );
      const url = URL.createObjectURL(merged);
      setMergedUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge video.');
    } finally {
      setIsMerging(false);
    }
  }, [recordedBlob, audioBlob, mergedUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearCountdown();
    };
  }, [clearCountdown]);

  const showLivePreview =
    isCameraOn && phase !== 'done' && phase !== 'generating';
  const showRecordedVideo =
    (phase === 'done' || phase === 'generating') && recordedUrl;

  const stepNumber =
    phase === 'idle' && !isCameraOn
      ? 1
      : phase === 'idle' && isCameraOn
        ? 2
        : phase === 'recording'
          ? 2
          : phase === 'analyzing'
            ? 3
            : phase === 'generating'
              ? 3
              : audioUrl && !mergedUrl
                ? 4
                : 4;

  return (
    <div className='flex w-full flex-col gap-8'>
      {/* Step indicator */}
      <div className='flex items-center gap-2'>
        {[
          { n: 1, label: 'Camera' },
          { n: 2, label: 'Record' },
          { n: 3, label: 'Analyze' },
          { n: 4, label: 'Result' },
        ].map(({ n, label }, i) => (
          <div key={n} className='flex items-center gap-2'>
            {i > 0 && (
              <div
                className={`h-px w-6 sm:w-10 transition-colors duration-500 ${
                  stepNumber >= n ? 'bg-[var(--accent)]' : 'bg-white/10'
                }`}
              />
            )}
            <div className='flex items-center gap-1.5'>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500 ${
                  stepNumber >= n
                    ? 'bg-[var(--accent)] text-[var(--background)]'
                    : 'bg-white/8 text-[var(--muted)]'
                }`}
              >
                {stepNumber > n ? '✓' : n}
              </span>
              <span
                className={`hidden text-xs font-medium sm:block transition-colors duration-500 ${
                  stepNumber >= n
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--muted)]/50'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Camera / Recorded video */}
      <div className='glass relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl'>
        {/* Live camera preview */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full rounded-2xl object-cover ${
            showLivePreview ? '' : 'hidden'
          }`}
        />

        {/* Recorded video playback */}
        {showRecordedVideo && (
          <video
            src={recordedUrl}
            controls
            playsInline
            className='h-full w-full rounded-2xl object-cover'
          />
        )}

        {/* Camera off state */}
        {!isCameraOn && (
          <button
            type='button'
            onClick={startCamera}
            className='group flex flex-col items-center gap-4 px-8 py-6'
          >
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.06] transition-all duration-300 group-hover:bg-[var(--accent)]/20 group-hover:scale-105'>
              <svg
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='text-[var(--accent)] transition-transform duration-300 group-hover:scale-110'
              >
                <path d='m22 8-6 4 6 4V8Z' />
                <rect x='1' y='5' width='15' height='14' rx='2' ry='2' />
              </svg>
            </div>
            <div className='flex flex-col items-center gap-1'>
              <span className='text-sm font-semibold text-[var(--foreground)]'>
                Open Camera
              </span>
              <span className='text-xs text-[var(--muted)]'>
                Tap to start your scene
              </span>
            </div>
          </button>
        )}

        {/* Recording overlay */}
        {phase === 'recording' && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-3'>
              <div className='relative flex items-center gap-2 rounded-full bg-black/60 px-5 py-2 backdrop-blur-md'>
                <span className='rec-pulse relative h-2.5 w-2.5 rounded-full bg-red-500' />
                <span className='text-sm font-semibold text-white tabular-nums'>
                  {countdown}s
                </span>
              </div>
              <span className='text-xs text-white/60'>
                Recording your scene...
              </span>
            </div>
          </div>
        )}

        {/* Analyzing overlay */}
        {phase === 'analyzing' && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-3'>
              <span className='h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-[var(--accent)]' />
              <span className='text-sm font-medium text-white'>
                Analyzing the mood...
              </span>
            </div>
          </div>
        )}

        {/* Generating BGM overlay */}
        {phase === 'generating' && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-3'>
              <span className='text-2xl animate-float'>🎵</span>
              <span className='text-sm font-medium text-white animate-pulse'>
                Composing your soundtrack...
              </span>
            </div>
          </div>
        )}

        {/* Close camera button */}
        {isCameraOn &&
          phase !== 'recording' &&
          phase !== 'analyzing' &&
          phase !== 'generating' && (
            <button
              type='button'
              onClick={stopCamera}
              className='absolute right-3 top-3 rounded-full bg-black/40 p-2 backdrop-blur-md transition-colors hover:bg-black/60'
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
              >
                <path d='M18 6 6 18M6 6l12 12' />
              </svg>
            </button>
          )}

        {/* REC indicator */}
        {phase === 'recording' && (
          <div className='absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-md'>
            <span className='h-2 w-2 rounded-full bg-red-500 animate-pulse' />
            <span className='text-[10px] font-bold tracking-wider text-white'>
              REC
            </span>
          </div>
        )}
      </div>

      {cameraError && (
        <div className='rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3'>
          <p className='text-sm text-red-400'>{cameraError}</p>
        </div>
      )}

      {/* Genre selector */}
      <div className='flex flex-col gap-3'>
        <span className='text-xs font-semibold tracking-widest uppercase text-[var(--muted)]'>
          Drama Genre
        </span>
        <div className='flex flex-wrap gap-2'>
          {GENRES.map((g) => (
            <button
              key={g}
              type='button'
              onClick={() => setSelectedGenre(g)}
              disabled={phase === 'recording' || phase === 'analyzing'}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 disabled:opacity-30 ${
                selectedGenre === g
                  ? 'bg-[var(--accent)] text-[var(--background)] shadow-lg shadow-[var(--accent)]/20'
                  : 'glass-light text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/8'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className='flex gap-3'>
        {phase === 'idle' && isCameraOn && (
          <button
            type='button'
            onClick={startRecording}
            className='group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all duration-200 hover:shadow-red-600/30 hover:brightness-110'
          >
            <span className='relative z-10 flex items-center justify-center gap-2'>
              <span className='h-2 w-2 rounded-full bg-white animate-pulse' />
              Start Recording (10s)
            </span>
          </button>
        )}
        {phase === 'done' && (
          <button
            type='button'
            onClick={retryRecording}
            className='flex-1 rounded-xl glass-light px-5 py-3.5 text-sm font-semibold text-[var(--foreground)] transition-all duration-200 hover:bg-white/10'
          >
            Record Again
          </button>
        )}
      </div>

      {error && (
        <div className='rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3'>
          <p className='text-sm text-red-400'>{error}</p>
        </div>
      )}

      {/* Results */}
      {keywords.length > 0 && (
        <div className='flex flex-col gap-6 animate-fade-in-up'>
          {/* Genre & Keywords */}
          <div className='glass rounded-2xl p-5'>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold tracking-widest uppercase text-[var(--muted)]'>
                  Selected Genre
                </span>
                <span className='rounded-full bg-[var(--accent-warm)]/15 px-3 py-1 text-sm font-semibold text-[var(--accent-warm)]'>
                  {selectedGenre}
                </span>
              </div>
              <div className='h-px bg-white/[0.06]' />
              <div className='flex flex-col gap-2.5'>
                <span className='text-xs font-semibold tracking-widest uppercase text-[var(--muted)]'>
                  Detected Mood
                </span>
                <div className='flex flex-wrap gap-2'>
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className='rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 text-sm text-[var(--accent)]'
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BGM Player */}
          <div className='glass rounded-2xl p-5'>
            <div className='flex flex-col gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-base'>🎵</span>
                <span className='text-xs font-semibold tracking-widest uppercase text-[var(--muted)]'>
                  Generated Soundtrack
                </span>
              </div>

              {isGeneratingBgm && (
                <div className='flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-4'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]' />
                  <span className='text-sm text-[var(--muted)]'>
                    Generating your K-drama BGM...
                  </span>
                </div>
              )}

              {audioUrl && !isGeneratingBgm && (
                <div className='flex flex-col gap-3'>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    className='w-full rounded-lg [&::-webkit-media-controls-panel]:bg-[var(--surface-light)]'
                  />
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => generateBgm(keywords)}
                      disabled={isGeneratingBgm}
                      className='flex-1 rounded-xl glass-light px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:bg-white/8 disabled:opacity-30'
                    >
                      Regenerate
                    </button>
                    <a
                      href={audioUrl}
                      download={`kdrama-bgm-${keywords.slice(0, 3).join('-')}.wav`}
                      className='flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--background)] transition-all hover:brightness-110'
                    >
                      Download BGM
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Merge Video + BGM */}
          {audioUrl && !isGeneratingBgm && recordedBlob && (
            <div className='glass rounded-2xl p-5'>
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-base'>🎬</span>
                  <span className='text-xs font-semibold tracking-widest uppercase text-[var(--muted)]'>
                    Final Cut
                  </span>
                </div>

                {!mergedUrl && !isMerging && (
                  <button
                    type='button'
                    onClick={handleMerge}
                    className='rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] px-5 py-3.5 text-sm font-semibold text-[var(--background)] shadow-lg shadow-[var(--accent)]/15 transition-all hover:brightness-110'
                  >
                    Merge Video + BGM
                  </button>
                )}

                {isMerging && (
                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3'>
                      <span className='h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent)]' />
                      <span className='text-sm text-[var(--muted)]'>
                        Merging your cinematic moment... {mergeProgress}%
                      </span>
                    </div>
                    <div className='h-1 w-full overflow-hidden rounded-full bg-white/10'>
                      <div
                        className='h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] transition-all duration-300'
                        style={{ width: `${mergeProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {mergedUrl && (
                  <div className='flex flex-col gap-4'>
                    <video
                      src={mergedUrl}
                      controls
                      playsInline
                      className='w-full rounded-xl'
                    />
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={handleMerge}
                        disabled={isMerging}
                        className='flex-1 rounded-xl glass-light px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:bg-white/8 disabled:opacity-30'
                      >
                        Re-merge
                      </button>
                      <a
                        href={mergedUrl}
                        download={`kdrama-bgm-${keywords.slice(0, 3).join('-')}.mp4`}
                        className='flex-1 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--background)] transition-all hover:brightness-110'
                      >
                        Download MP4
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
