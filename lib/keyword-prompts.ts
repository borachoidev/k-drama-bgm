interface PromptConfig {
  prompt: string;
  bpm: number;
  brightness: number;
  density: number;
}

const MOOD_MAP: Record<string, Partial<PromptConfig>> = {
  따뜻한: { brightness: 0.7, density: 0.4, bpm: 85 },
  편안한: { brightness: 0.6, density: 0.3, bpm: 75 },
  차가운: { brightness: 0.3, density: 0.4, bpm: 70 },
  긴장감: { brightness: 0.4, density: 0.7, bpm: 120 },
  슬픈: { brightness: 0.3, density: 0.3, bpm: 65 },
  우울한: { brightness: 0.2, density: 0.3, bpm: 60 },
  밝은: { brightness: 0.8, density: 0.5, bpm: 110 },
  어두운: { brightness: 0.2, density: 0.5, bpm: 80 },
  로맨틱한: { brightness: 0.6, density: 0.4, bpm: 90 },
  설레는: { brightness: 0.7, density: 0.5, bpm: 100 },
  고요한: { brightness: 0.4, density: 0.2, bpm: 60 },
  몽환적: { brightness: 0.5, density: 0.3, bpm: 70 },
  활기찬: { brightness: 0.8, density: 0.7, bpm: 120 },
  무거운: { brightness: 0.3, density: 0.6, bpm: 75 },
  신비로운: { brightness: 0.5, density: 0.4, bpm: 80 },
  잔잔한: { brightness: 0.5, density: 0.2, bpm: 70 },
  격렬한: { brightness: 0.6, density: 0.8, bpm: 140 },
  쓸쓸한: { brightness: 0.3, density: 0.2, bpm: 65 },
  희망적: { brightness: 0.7, density: 0.5, bpm: 100 },
  불안한: { brightness: 0.3, density: 0.6, bpm: 110 },
  감성적: { brightness: 0.5, density: 0.4, bpm: 80 },
  서정적: { brightness: 0.5, density: 0.3, bpm: 75 },
  드라마틱: { brightness: 0.5, density: 0.7, bpm: 100 },
  코믹한: { brightness: 0.8, density: 0.6, bpm: 130 },
  공포스러운: { brightness: 0.1, density: 0.5, bpm: 90 },
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
      const direct = MOOD_MAP[kw];
      if (direct) return direct;
      const found = Object.keys(MOOD_MAP).find(
        (key) => kw.includes(key) || key.includes(kw),
      );
      return found ? MOOD_MAP[found] : null;
    })
    .filter((v): v is Partial<PromptConfig> => v !== null);

  const bpmValues = matched
    .map((m) => m.bpm)
    .filter((v): v is number => v != null);
  const brightnessValues = matched
    .map((m) => m.brightness)
    .filter((v): v is number => v != null);
  const densityValues = matched
    .map((m) => m.density)
    .filter((v): v is number => v != null);

  const bpm = clamp(Math.round(average(bpmValues)), 50, 160) || 85;
  const brightness = clamp(average(brightnessValues), 0, 1) || 0.5;
  const density = clamp(average(densityValues), 0, 1) || 0.4;

  const moodDescription = keywords.join(', ');
  const prompt = `Korean drama background music. Mood: ${moodDescription}. Cinematic, emotional, instrumental soundtrack.`;

  return { prompt, bpm, brightness, density };
}
