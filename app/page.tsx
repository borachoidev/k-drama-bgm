"use client";

import { useState } from "react";
import { MoodAnalyzer } from "./components/mood-analyzer";

export default function Home() {
  const [bgColor, setBgColor] = useState<string | null>(null);

  return (
    <div
      className="flex min-h-screen items-center justify-center font-sans"
      style={{
        backgroundColor: bgColor ?? "#fafafa",
        transition: "background-color 1.5s ease-in-out",
      }}
    >
      <main className="flex w-full max-w-3xl flex-col items-center justify-center px-6 py-16 sm:px-8">
        <MoodAnalyzer onBgColorChange={setBgColor} />
      </main>
    </div>
  );
}
