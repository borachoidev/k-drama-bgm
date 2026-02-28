# K-Drama BGM Generator

AI-powered background music generator for Korean dramas. Record a short video, and the AI analyzes its mood to compose a unique cinematic soundtrack tailored to your chosen K-drama genre.

## How It Works

```
Record Video (10s) → Mood Analysis (Gemini Vision) → BGM Generation (Lyria) → Merge & Download
```

1. **Record** a 10-second video through your camera
2. **Gemini 2.5 Flash** analyzes the video's color tones, expressions, and composition to extract mood keywords
3. **Select a genre** from 12 K-drama presets (Romance, Thriller, Historical, etc.)
4. **Lyria Realtime API** generates a 10-second instrumental BGM based on genre (70%) + detected mood (30%)
5. **Merge** the video and BGM in-browser using FFmpeg WASM, then download as MP4

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Mood Analysis | Google Gemini 2.5 Flash (Vision) |
| Music Generation | Google Lyria Realtime API |
| Video Processing | FFmpeg.js (WASM, runs in browser) |
| Audio Encoding | Custom WAV encoder (48kHz, stereo, 16-bit) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Google AI API key (Gemini + Lyria access)

### Installation

```bash
pnpm install
```

### Environment Variables

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_google_ai_api_key
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Genre Presets

| Genre | Style | BPM |
|-------|-------|-----|
| Romance | Gentle piano and strings | 88 |
| Melodrama | Solo piano and cello | 70 |
| Thriller | Pulsing synths, tense | 115 |
| Comedy | Playful, bouncy rhythm | 125 |
| Historical | Gayageum, daegeum, orchestral | 78 |
| Mystery | Eerie ambient | 80 |
| Slice of Life | Acoustic guitar, light percussion | 95 |
| Fantasy | Sweeping orchestral with choir | 90 |
| Medical | Emotional strings and piano | 85 |
| Legal | Deep brass and percussion | 82 |
| Action | Driving drums, electric guitar | 135 |
| Horror | Sparse dissonant tones | 70 |

## API Endpoints

### POST `/api/analyze-mood`

Analyzes a video for mood keywords and suggests a background color.

- **Input:** `{ video: string (base64), mimeType: string }`
- **Output:** `{ keywords: string[], bgColor: string }`

### POST `/api/generate-bgm`

Generates a 10-second WAV soundtrack based on mood keywords and genre.

- **Input:** `{ keywords: string[], genre?: string }`
- **Output:** `audio/wav` binary

## Project Structure

```
app/
├── api/
│   ├── analyze-mood/route.ts    # Gemini Vision mood analysis
│   └── generate-bgm/route.ts   # Lyria music generation
├── components/
│   ├── mood-analyzer.tsx        # Camera + recording + full workflow
│   └── mood-upload.tsx          # Alternative: file upload flow
├── globals.css
├── layout.tsx
└── page.tsx
lib/
├── keyword-prompts.ts           # Genre & mood → music parameter mapping
├── wav-encoder.ts               # PCM → WAV encoding
├── merge-video.ts               # FFmpeg WASM video + audio merge
└── types.ts
```

## Browser Requirements

- MediaRecorder API
- getUserMedia (camera access)
- SharedArrayBuffer (FFmpeg WASM)
- WebAssembly support

## License

Private
