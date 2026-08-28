import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings";

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
  });

  it("merges partial saved settings over defaults", async () => {
    mockedInvoke.mockResolvedValue({ theme: "dark", editorFontSize: 16 });
    const settings = await loadSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.editorFontSize).toBe(16);
    expect(settings.previewFontSize).toBe(DEFAULT_SETTINGS.previewFontSize);
    expect(settings.windowState).toEqual(DEFAULT_SETTINGS.windowState);
  });

  it("saves settings via the Rust command", async () => {
    mockedInvoke.mockResolvedValue(undefined);
    const next = { ...DEFAULT_SETTINGS, theme: "dark" as const };
    await saveSettings(next);
    expect(mockedInvoke).toHaveBeenCalledWith("save_settings", { settings: next });
  });

  it("falls back to defaults when invoke fails (non-Tauri env)", async () => {
    mockedInvoke.mockRejectedValue(new Error("not in tauri"));
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});
