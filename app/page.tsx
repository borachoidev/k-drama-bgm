'use client';

import { useState } from 'react';
import { MoodAnalyzer } from './components/mood-analyzer';

export default function Home() {
  const [bgColor, setBgColor] = useState<string | null>(null);

  return (
    <div
      className="relative min-h-screen font-sans"
      style={{
        backgroundColor: bgColor ?? undefined,
        transition: 'background-color 2s ease-in-out',
      }}
    >
      {/* Ambient background gradient */}
      {!bgColor && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-[60vh] w-[60vh] rounded-full bg-[#e8b4b8]/[0.04] blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[50vh] w-[50vh] rounded-full bg-[#d4956a]/[0.04] blur-[120px]" />
        </div>
      )}

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 sm:px-8">
        {/* Header */}
        <header className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎬</span>
            <span className="text-sm font-medium tracking-widest uppercase text-[var(--muted)]">
              K-Drama BGM
            </span>
          </div>
        </header>

        {/* Hero */}
        <section className="mb-12 flex flex-col gap-4 animate-fade-in-up-delay-1">
          <h1 className="text-4xl font-bold tracking-tight leading-[1.15] sm:text-5xl">
            <span className="gradient-text">Be the Main Character</span>
            <br />
            <span className="text-[var(--foreground)]">of Your Own Drama</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-[var(--muted)]">
            Record a 10-second scene and our AI will analyze the mood,
            compose the perfect K-drama soundtrack, and merge it into your video.
          </p>
        </section>

        {/* Main content */}
        <main className="flex-1 animate-fade-in-up-delay-2">
          <MoodAnalyzer onBgColorChange={setBgColor} />
        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-white/[0.06] pt-6 animate-fade-in-up-delay-3">
          <p className="text-xs text-[var(--muted)]/60">
            Powered by Google Gemini &amp; Lyria — AI-generated music for your cinematic moments
          </p>
        </footer>
      </div>
    </div>
  );
}
