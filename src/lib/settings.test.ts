import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "./settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockedInvoke = vi.mocked(invoke);

describe("settings persistence (T07)", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("returns defaults when no saved settings exist", async () => {
    mockedInvoke.mockResolvedValue(null);
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.windowState).toEqual({ width: 800, height: 600 });
    expect(settings.splitRatio).toBe(33.3333);
  });

  it("merges partial saved settings over defaults", async () => {
    mockedInvoke.mockResolvedValue({ theme: "dark", editorFontSize: 16 });
    const settings = await loadSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.editorFontSize).toBe(16);
    expect(settings.previewFontSize).toBe(DEFAULT_SETTINGS.previewFontSize);
    expect(settings.windowState).toEqual(DEFAULT_SETTINGS.windowState);
    expect(settings.splitRatio).toBe(DEFAULT_SETTINGS.splitRatio);
  });

  it("merges partial window state and legacy settings safely", async () => {
    mockedInvoke.mockResolvedValue({
      windowState: { width: 1280, x: 24 },
    });

    const settings = await loadSettings();

    expect(settings.windowState).toEqual({
      width: 1280,
      height: DEFAULT_SETTINGS.windowState.height,
      x: 24,
    });
    expect(settings.splitRatio).toBe(DEFAULT_SETTINGS.splitRatio);
    expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it("clamps invalid saved split ratios to the supported boundary", async () => {
    mockedInvoke.mockResolvedValue({ splitRatio: 100 });

    const settings = await loadSettings();

    expect(settings.splitRatio).toBe(85);
  });

  it("uses defaults for invalid persisted theme, font, and split values", async () => {
    mockedInvoke.mockResolvedValue({
      theme: "solarized",
      editorFontSize: 0,
      previewFontSize: 999,
      splitRatio: "not-a-number",
    });

    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("uses default window geometry for values outside native ranges", async () => {
    mockedInvoke.mockResolvedValue({
      windowState: {
        width: 4_294_967_296,
        height: -1,
        x: 2_147_483_648,
        y: -2_147_483_649,
        maximized: "yes",
      },
    });

    const settings = await loadSettings();

    expect(settings.windowState).toEqual(DEFAULT_SETTINGS.windowState);
  });

  it("saves settings via the Rust command", async () => {
    mockedInvoke.mockResolvedValue(undefined);
    const next = { ...DEFAULT_SETTINGS, theme: "dark" as const };
    await saveSettings(next);
    expect(mockedInvoke).toHaveBeenCalledWith("save_settings", { settings: next });
  });

  it("clamps invalid split ratios before saving", async () => {
    mockedInvoke.mockResolvedValue(undefined);

    await saveSettings({ ...DEFAULT_SETTINGS, splitRatio: 0 });

    expect(mockedInvoke).toHaveBeenCalledWith(
      "save_settings",
      expect.objectContaining({ settings: expect.objectContaining({ splitRatio: 15 }) }),
    );
  });

  it("falls back to defaults when persisted settings are corrupted", async () => {
    mockedInvoke.mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});
