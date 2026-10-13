export type TileSizeOption = 16 | 24 | 32 | 48;

export interface AppSettings {
  tileSize: TileSizeOption;
  maxBoards: number;
  exportPdf: boolean;
  exportPng: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  tileSize: 32,
  maxBoards: 12,
  exportPdf: true,
  exportPng: true,
};

export const TILE_SIZE_OPTIONS: TileSizeOption[] = [16, 24, 32, 48];

export const MIN_MAX_BOARDS = 1;
export const MAX_MAX_BOARDS = 36;
