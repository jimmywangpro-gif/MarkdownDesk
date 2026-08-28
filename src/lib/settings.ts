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
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  editorFontSize: 14,
  previewFontSize: 16,
  windowState: { width: 800, height: 600 },
};

/** Load persisted settings from the Rust backend (app data JSON). */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await invoke<Settings | null>("load_settings");
    if (!raw) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      windowState: { ...DEFAULT_SETTINGS.windowState, ...raw.windowState },
    };
  } catch {
    // Non-Tauri environment (browser dev / tests): fall back to defaults.
    return DEFAULT_SETTINGS;
  }
}

/** Persist settings via the Rust backend. No-op outside Tauri. */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await invoke("save_settings", { settings });
  } catch {
    // Non-Tauri environment: persistence is a no-op.
  }
}
