interface PromptConfig {
  prompt: string;
  bpm: number;
  brightness: number;
  density: number;
}

const MOOD_MAP: Record<string, Partial<PromptConfig>> = {
  warm: { brightness: 0.7, density: 0.4, bpm: 85 },
  cozy: { brightness: 0.6, density: 0.3, bpm: 75 },
  cold: { brightness: 0.3, density: 0.4, bpm: 70 },
  tense: { brightness: 0.4, density: 0.7, bpm: 120 },
  sad: { brightness: 0.3, density: 0.3, bpm: 65 },
  melancholy: { brightness: 0.2, density: 0.3, bpm: 60 },
  bright: { brightness: 0.8, density: 0.5, bpm: 110 },
  dark: { brightness: 0.2, density: 0.5, bpm: 80 },
  romantic: { brightness: 0.6, density: 0.4, bpm: 90 },
  fluttering: { brightness: 0.7, density: 0.5, bpm: 100 },
  serene: { brightness: 0.4, density: 0.2, bpm: 60 },
  dreamy: { brightness: 0.5, density: 0.3, bpm: 70 },
  lively: { brightness: 0.8, density: 0.7, bpm: 120 },
  heavy: { brightness: 0.3, density: 0.6, bpm: 75 },
  mysterious: { brightness: 0.5, density: 0.4, bpm: 80 },
  calm: { brightness: 0.5, density: 0.2, bpm: 70 },
  intense: { brightness: 0.6, density: 0.8, bpm: 140 },
  lonely: { brightness: 0.3, density: 0.2, bpm: 65 },
  hopeful: { brightness: 0.7, density: 0.5, bpm: 100 },
  anxious: { brightness: 0.3, density: 0.6, bpm: 110 },
  emotional: { brightness: 0.5, density: 0.4, bpm: 80 },
  lyrical: { brightness: 0.5, density: 0.3, bpm: 75 },
  dramatic: { brightness: 0.5, density: 0.7, bpm: 100 },
  comedic: { brightness: 0.8, density: 0.6, bpm: 130 },
  eerie: { brightness: 0.1, density: 0.5, bpm: 90 },
  peaceful: { brightness: 0.6, density: 0.2, bpm: 68 },
  nostalgic: { brightness: 0.5, density: 0.3, bpm: 78 },
  cheerful: { brightness: 0.8, density: 0.6, bpm: 115 },
  gloomy: { brightness: 0.2, density: 0.4, bpm: 65 },
  suspenseful: { brightness: 0.3, density: 0.7, bpm: 105 },
  passionate: { brightness: 0.7, density: 0.6, bpm: 110 },
  gentle: { brightness: 0.6, density: 0.2, bpm: 72 },
  bittersweet: { brightness: 0.4, density: 0.4, bpm: 78 },
};

function average(values: number[]): number {
  if (values.length === 0) return 0.5;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getPromptConfig(keyword: string): PromptConfig;
export function getPromptConfig(keywords: string[]): PromptConfig;
export function getPromptConfig(input: string | string[]): PromptConfig {
  const keywords = Array.isArray(input) ? input : [input];

  const matched = keywords
    .map((kw) => {
      const lower = kw.toLowerCase();
      const direct = MOOD_MAP[lower];
      if (direct) return direct;
      const found = Object.keys(MOOD_MAP).find(
        (key) => lower.includes(key) || key.includes(lower)
      );
      return found ? MOOD_MAP[found] : null;
    })
    .filter((v): v is Partial<PromptConfig> => v !== null);

  const bpmValues = matched.map((m) => m.bpm).filter((v): v is number => v != null);
  const brightnessValues = matched.map((m) => m.brightness).filter((v): v is number => v != null);
  const densityValues = matched.map((m) => m.density).filter((v): v is number => v != null);

  const bpm = clamp(Math.round(average(bpmValues)), 50, 160) || 85;
  const brightness = clamp(average(brightnessValues), 0, 1) || 0.5;
  const density = clamp(average(densityValues), 0, 1) || 0.4;

  const moodDescription = keywords.join(', ');
  const prompt = `Korean drama background music. Mood: ${moodDescription}. Cinematic, emotional, instrumental soundtrack.`;

  return { prompt, bpm, brightness, density };
}
