export type GenerationStatus = "idle" | "generating" | "done" | "error";

export interface GenerateBgmRequest {
  keyword: string;
}

export interface GenerateBgmErrorResponse {
  error: string;
}

export interface GenrePreset {
  keyword: string;
  label: string;
}
