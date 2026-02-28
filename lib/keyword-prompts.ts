interface PromptConfig {
  prompt: string;
  bpm: number;
  brightness: number;
  density: number;
}

interface GenreConfig {
  promptStyle: string;
  bpm: number;
  brightness: number;
  density: number;
}

const GENRE_MAP: Record<string, GenreConfig> = {
  로맨스: {
    promptStyle: 'warm romantic K-drama love story, gentle piano and strings',
    bpm: 88,
    brightness: 0.65,
    density: 0.4,
  },
  멜로: {
    promptStyle:
      'emotional melodrama, sorrowful yet beautiful, solo piano and cello',
    bpm: 70,
    brightness: 0.4,
    density: 0.3,
  },
  스릴러: {
    promptStyle:
      'dark suspenseful thriller, tense and gripping, pulsing synths',
    bpm: 115,
    brightness: 0.25,
    density: 0.7,
  },
  코미디: {
    promptStyle: 'light comedic K-drama, playful and cheerful, bouncy rhythm',
    bpm: 125,
    brightness: 0.85,
    density: 0.6,
  },
  사극: {
    promptStyle:
      'historical Korean period drama, traditional instruments gayageum and daegeum, majestic orchestral',
    bpm: 78,
    brightness: 0.45,
    density: 0.5,
  },
  미스터리: {
    promptStyle:
      'mysterious investigative drama, eerie ambient, subtle tension',
    bpm: 80,
    brightness: 0.3,
    density: 0.4,
  },
  일상: {
    promptStyle:
      'slice-of-life K-drama, casual and warm acoustic guitar, light percussion',
    bpm: 95,
    brightness: 0.7,
    density: 0.35,
  },
  판타지: {
    promptStyle:
      'fantasy K-drama, ethereal and grand, sweeping orchestral with choir',
    bpm: 90,
    brightness: 0.55,
    density: 0.55,
  },
  의학: {
    promptStyle:
      'medical drama, hopeful yet tense, emotional strings and piano',
    bpm: 85,
    brightness: 0.5,
    density: 0.45,
  },
  법정: {
    promptStyle:
      'courtroom legal drama, serious and heavy, deep brass and percussion',
    bpm: 82,
    brightness: 0.35,
    density: 0.55,
  },
  액션: {
    promptStyle:
      'action K-drama, intense and powerful, driving drums and electric guitar',
    bpm: 135,
    brightness: 0.5,
    density: 0.8,
  },
  공포: {
    promptStyle: 'horror K-drama, dark and unsettling, sparse dissonant tones',
    bpm: 70,
    brightness: 0.1,
    density: 0.35,
  },
};

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

export function getPromptConfig(
  keywords: string[],
  genre?: string,
): PromptConfig {
  const genreConfig = genre ? (GENRE_MAP[genre] ?? null) : null;

  const matched = keywords
    .map((kw) => {
      const lower = kw.toLowerCase();
      const direct = MOOD_MAP[lower];
      if (direct) return direct;
      const found = Object.keys(MOOD_MAP).find(
        (key) => lower.includes(key) || key.includes(lower),
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

  // Genre has stronger influence (70%) than mood (30%)
  const MOOD_WEIGHT = 0.3;
  const GENRE_WEIGHT = 0.7;

  let bpm: number;
  let brightness: number;
  let density: number;

  if (genreConfig && bpmValues.length > 0) {
    bpm = Math.round(
      average(bpmValues) * MOOD_WEIGHT + genreConfig.bpm * GENRE_WEIGHT,
    );
    brightness =
      average(brightnessValues) * MOOD_WEIGHT +
      genreConfig.brightness * GENRE_WEIGHT;
    density =
      average(densityValues) * MOOD_WEIGHT + genreConfig.density * GENRE_WEIGHT;
  } else if (genreConfig) {
    bpm = genreConfig.bpm;
    brightness = genreConfig.brightness;
    density = genreConfig.density;
  } else {
    bpm = Math.round(average(bpmValues)) || 85;
    brightness = average(brightnessValues) || 0.5;
    density = average(densityValues) || 0.4;
  }

  bpm = clamp(bpm, 50, 160);
  brightness = clamp(brightness, 0, 1);
  density = clamp(density, 0, 1);

  const moodDescription = keywords.join(', ');
  const genreStyle =
    genreConfig?.promptStyle ?? 'cinematic, emotional, instrumental soundtrack';
  const prompt = `Korean ${genre ?? 'drama'} soundtrack. ${genreStyle}. Powerful, bold opening with immediate impact. Subtle mood hint: ${moodDescription}. Instrumental only.`;

  return { prompt, bpm, brightness, density };
}
