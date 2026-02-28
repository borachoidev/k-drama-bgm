import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export async function mergeVideoAndAudio(
  videoBlob: Blob,
  audioBlob: Blob,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(progress));
  }

  const videoData = await fetchFile(videoBlob);
  const audioData = await fetchFile(audioBlob);

  await ff.writeFile("input.webm", videoData);
  await ff.writeFile("input.wav", audioData);

  await ff.exec([
    "-i", "input.webm",
    "-i", "input.wav",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  const data = await ff.readFile("output.mp4");
  const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);

  await ff.deleteFile("input.webm");
  await ff.deleteFile("input.wav");
  await ff.deleteFile("output.mp4");

  if (onProgress) {
    ff.off("progress", () => {});
  }

  return new Blob([uint8], { type: "video/mp4" });
}
