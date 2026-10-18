export type TileSizeOption = 16 | 24 | 32 | 48;

export type QualityMode = "standard" | "dithered";

export interface AppSettings {
  tileSize: TileSizeOption;
  maxBoards: number;
  exportPdf: boolean;
  exportPng: boolean;
  /** Floyd–Steinberg dithering for richer gradients */
  qualityMode: QualityMode;
  /** When non-empty, only these hex colours are used during generate */
  ownedColorHexes: string[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  tileSize: 32,
  maxBoards: 12,
  exportPdf: true,
  exportPng: true,
  qualityMode: "standard",
  ownedColorHexes: [],
};

export const TILE_SIZE_OPTIONS: TileSizeOption[] = [16, 24, 32, 48];

export const MIN_MAX_BOARDS = 1;
export const MAX_MAX_BOARDS = 36;
