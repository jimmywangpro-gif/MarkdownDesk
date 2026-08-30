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

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT_RATIO;
  return Math.round(Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, ratio)) * 10000) / 10000;
}

function mergeWindowState(raw: unknown): WindowState {
  const saved = isRecord(raw) ? raw : {};
  const windowState: WindowState = {
    width:
      isFiniteNumber(saved.width) && saved.width > 0
        ? saved.width
        : DEFAULT_SETTINGS.windowState.width,
    height:
      isFiniteNumber(saved.height) && saved.height > 0
        ? saved.height
        : DEFAULT_SETTINGS.windowState.height,
  };

  if (isFiniteNumber(saved.x)) windowState.x = saved.x;
  if (isFiniteNumber(saved.y)) windowState.y = saved.y;
  if (typeof saved.maximized === "boolean") windowState.maximized = saved.maximized;

  return windowState;
}

function mergeSettings(raw: unknown): Settings {
  const saved = isRecord(raw) ? raw : {};

  return {
    theme: saved.theme === "dark" ? "dark" : saved.theme === "light" ? "light" : DEFAULT_SETTINGS.theme,
    editorFontSize: isFiniteNumber(saved.editorFontSize)
      ? saved.editorFontSize
      : DEFAULT_SETTINGS.editorFontSize,
    previewFontSize: isFiniteNumber(saved.previewFontSize)
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
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await invoke("save_settings", { settings: mergeSettings(settings) });
  } catch {
    // Non-Tauri environment: persistence is a no-op.
  }
}
