interface PromptConfig {
  prompt: string;
  bpm: number;
  brightness: number;
  density: number;
}

const GENRE_PROMPTS: Record<string, PromptConfig> = {
  사극: {
    prompt:
      "Epic Korean historical drama soundtrack with gayageum, daegeum, and haegeum traditional instruments layered with grand orchestral strings, deep taiko drums, and majestic brass. Cinematic and powerful.",
    bpm: 100,
    brightness: 0.5,
    density: 0.7,
  },
  로맨스: {
    prompt:
      "Tender Korean drama romance soundtrack with soft piano melody, gentle acoustic guitar arpeggios, warm string ensemble, and delicate celesta. Sweet, emotional, and heartwarming.",
    bpm: 80,
    brightness: 0.6,
    density: 0.4,
  },
  스릴러: {
    prompt:
      "Intense Korean thriller drama soundtrack with dark pulsing synths, tense string tremolo, low brass drones, eerie piano notes, and suspenseful percussion. Dark and gripping.",
    bpm: 120,
    brightness: 0.3,
    density: 0.6,
  },
  판타지: {
    prompt:
      "Ethereal Korean fantasy drama soundtrack with shimmering harp arpeggios, soaring orchestral strings, mystical choir pads, enchanting flute melody, and magical celesta bells. Dreamy and wondrous.",
    bpm: 90,
    brightness: 0.7,
    density: 0.5,
  },
  코미디: {
    prompt:
      "Playful Korean comedy drama soundtrack with bouncy pizzicato strings, cheerful ukulele, light xylophone melody, whimsical woodwinds, and upbeat claps. Fun and lighthearted.",
    bpm: 130,
    brightness: 0.8,
    density: 0.6,
  },
  멜로: {
    prompt:
      "Deeply emotional Korean melodrama soundtrack with melancholic solo violin, sorrowful piano chords, lush string orchestra swells, and gentle oboe. Bittersweet and tearful.",
    bpm: 70,
    brightness: 0.4,
    density: 0.3,
  },
  액션: {
    prompt:
      "High-energy Korean action drama soundtrack with driving orchestral percussion, powerful brass hits, fast string ostinato, intense electric guitar riffs, and cinematic impact drums. Adrenaline-pumping.",
    bpm: 150,
    brightness: 0.6,
    density: 0.8,
  },
  일상: {
    prompt:
      "Warm Korean slice-of-life drama soundtrack with gentle acoustic guitar fingerpicking, soft piano chords, light brushed drums, cozy ukulele, and mellow flute. Calm and comforting.",
    bpm: 95,
    brightness: 0.6,
    density: 0.3,
  },
};

const FALLBACK_PROMPT: PromptConfig = {
  prompt:
    "Beautiful Korean drama instrumental soundtrack with emotional piano, warm strings, and gentle orchestral arrangement. Cinematic and evocative.",
  bpm: 90,
  brightness: 0.5,
  density: 0.5,
};

export function getPromptConfig(keyword: string): PromptConfig {
  return GENRE_PROMPTS[keyword.trim()] ?? {
    ...FALLBACK_PROMPT,
    prompt: `Korean drama BGM inspired by the theme "${keyword}". ${FALLBACK_PROMPT.prompt}`,
  };
}

export const GENRE_PRESETS = Object.keys(GENRE_PROMPTS).map((keyword) => ({
  keyword,
  label: keyword,
}));
