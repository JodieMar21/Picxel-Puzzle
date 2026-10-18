import type { PixelationResult } from "@shared/schema";

const KEY = "fractix-open-project";

export interface OpenProjectPayload {
  projectId: string;
  name: string;
  boardCount: number;
  boardLayout: string;
  boardRows?: number | null;
  boardCols?: number | null;
  pixelationResult: PixelationResult;
}

export function stashOpenProject(payload: OpenProjectPayload): void {
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function consumeOpenProject(): OpenProjectPayload | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as OpenProjectPayload;
  } catch {
    return null;
  }
}
