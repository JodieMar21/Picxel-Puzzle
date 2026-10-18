import {
  DEFAULT_APP_SETTINGS,
  MAX_MAX_BOARDS,
  MIN_MAX_BOARDS,
  TILE_SIZE_OPTIONS,
  type AppSettings,
  type QualityMode,
  type TileSizeOption,
} from "./types";

export const APP_SETTINGS_KEY = "fractix-app-settings";
export const APP_SETTINGS_EVENT = "fractix-app-settings-changed";

function isTileSize(value: unknown): value is TileSizeOption {
  return typeof value === "number" && TILE_SIZE_OPTIONS.includes(value as TileSizeOption);
}

function isQualityMode(value: unknown): value is QualityMode {
  return value === "standard" || value === "dithered";
}

export function normalizeAppSettings(partial?: Partial<AppSettings> | null): AppSettings {
  const maxBoardsRaw = Number(partial?.maxBoards ?? DEFAULT_APP_SETTINGS.maxBoards);
  const maxBoards = Number.isFinite(maxBoardsRaw)
    ? Math.min(MAX_MAX_BOARDS, Math.max(MIN_MAX_BOARDS, Math.round(maxBoardsRaw)))
    : DEFAULT_APP_SETTINGS.maxBoards;

  const owned = Array.isArray(partial?.ownedColorHexes)
    ? partial.ownedColorHexes
        .filter((h): h is string => typeof h === "string")
        .map((h) => h.trim().toUpperCase())
        .filter((h) => /^#[0-9A-F]{6}$/.test(h))
    : DEFAULT_APP_SETTINGS.ownedColorHexes;

  return {
    tileSize: isTileSize(partial?.tileSize) ? partial.tileSize : DEFAULT_APP_SETTINGS.tileSize,
    maxBoards,
    exportPdf: partial?.exportPdf ?? DEFAULT_APP_SETTINGS.exportPdf,
    exportPng: partial?.exportPng ?? DEFAULT_APP_SETTINGS.exportPng,
    qualityMode: isQualityMode(partial?.qualityMode)
      ? partial.qualityMode
      : DEFAULT_APP_SETTINGS.qualityMode,
    ownedColorHexes: owned,
  };
}

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS, ownedColorHexes: [] };
    return normalizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_APP_SETTINGS, ownedColorHexes: [] };
  }
}

export function saveAppSettings(settings: AppSettings): AppSettings {
  const normalized = normalizeAppSettings(settings);
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, { detail: normalized }));
  return normalized;
}

export function updateAppSettings(partial: Partial<AppSettings>): AppSettings {
  return saveAppSettings({ ...getAppSettings(), ...partial });
}
