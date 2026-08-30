import { invoke } from "@tauri-apps/api/core";

export type Theme = "light" | "dark";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export interface Settings {
  theme: Theme;
  editorFontSize: number;
  previewFontSize: number;
  windowState: WindowState;
  splitRatio: number;
}

export const SPLIT_RATIO_MIN = 15;
export const SPLIT_RATIO_MAX = 85;
export const DEFAULT_SPLIT_RATIO = 33.3333;
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 32;

const U32_MAX = 4_294_967_295;
const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  editorFontSize: 14,
  previewFontSize: 16,
  windowState: { width: 800, height: 600 },
  splitRatio: DEFAULT_SPLIT_RATIO,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNativeInteger(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
}

function isFontSize(value: unknown): value is number {
  return isNativeInteger(value, FONT_SIZE_MIN, FONT_SIZE_MAX);
}

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT_RATIO;
  return Math.round(Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio)) * 10000) / 10000;
}

function mergeWindowState(raw: unknown): WindowState {
  const saved = isRecord(raw) ? raw : {};
  const windowState: WindowState = {
    width: isNativeInteger(saved.width, 1, U32_MAX)
      ? saved.width
      : DEFAULT_SETTINGS.windowState.width,
    height: isNativeInteger(saved.height, 1, U32_MAX)
      ? saved.height
      : DEFAULT_SETTINGS.windowState.height,
  };

  if (isNativeInteger(saved.x, I32_MIN, I32_MAX)) windowState.x = saved.x;
  if (isNativeInteger(saved.y, I32_MIN, I32_MAX)) windowState.y = saved.y;
  if (typeof saved.maximized === "boolean") windowState.maximized = saved.maximized;

  return windowState;
}

function mergeSettings(raw: unknown): Settings {
  const saved = isRecord(raw) ? raw : {};

  return {
    theme: saved.theme === "dark" ? "dark" : saved.theme === "light" ? "light" : DEFAULT_SETTINGS.theme,
    editorFontSize: isFontSize(saved.editorFontSize)
      ? saved.editorFontSize
      : DEFAULT_SETTINGS.editorFontSize,
    previewFontSize: isFontSize(saved.previewFontSize)
      ? saved.previewFontSize
      : DEFAULT_SETTINGS.previewFontSize,
    windowState: mergeWindowState(saved.windowState),
    splitRatio: isFiniteNumber(saved.splitRatio)
      ? clampSplitRatio(saved.splitRatio)
      : DEFAULT_SPLIT_RATIO,
  };
}

/** Load persisted settings from the Rust backend (app data JSON). */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await invoke<unknown>("load_settings");
    return mergeSettings(raw);
  } catch {
    // Non-Tauri environment (browser dev / tests): fall back to defaults.
    return mergeSettings(null);
  }
}

/** Persist settings via the Rust backend. No-op outside Tauri. */
let saveQueue: Promise<void> | null = null;

export function saveSettings(settings: Settings): Promise<void> {
  const normalized = mergeSettings(settings);
  const write = async () => {
    try {
      await invoke("save_settings", { settings: normalized });
    } catch {
      // Non-Tauri environment: persistence is a no-op.
    }
  };

  saveQueue = saveQueue === null ? write() : saveQueue.then(write);
  return saveQueue;
}
