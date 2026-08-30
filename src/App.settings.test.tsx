import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsProvider, useSettings } from "./lib/SettingsContext";
import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

const mockedInvoke = vi.mocked(invoke);

function renderApp() {
  return render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
}

function SettingsProbe() {
  const { loaded, settings, setWindowState, setSplitRatio } = useSettings();

  return (
    <>
      <output data-testid="settings-loaded">{String(loaded)}</output>
      <output data-testid="split-ratio">{settings.splitRatio}</output>
      <button
        data-testid="set-window-state"
        onClick={() =>
          setWindowState({
            width: 1280,
            height: 720,
            x: 24,
            y: 48,
            maximized: false,
          })
        }
      />
      <button data-testid="set-split-too-wide" onClick={() => setSplitRatio(100)} />
      <button data-testid="set-split-too-narrow" onClick={() => setSplitRatio(0)} />
    </>
  );
}

describe("MarkdownDesk settings UI (T07)", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockResolvedValue(null); // no persisted settings
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--editor-font-size");
    document.documentElement.style.removeProperty("--preview-font-size");
  });

  it("toggles theme instantly and persists it", async () => {
    renderApp();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));

    fireEvent.click(screen.getByTestId("theme-toggle"));

    expect(document.documentElement.dataset.theme).toBe("dark");
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({ theme: "dark" }),
        }),
      ),
    );
  });

  it("adjusts editor font size live and persists", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByTestId("editor-font-size").textContent).toBe("14px"));

    fireEvent.click(screen.getByTestId("editor-font-increase"));

    expect(screen.getByTestId("editor-font-size").textContent).toBe("15px");
    expect(document.documentElement.style.getPropertyValue("--editor-font-size")).toBe("15px");
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({ editorFontSize: 15 }),
        }),
      ),
    );
  });

  it("adjusts preview font size live and persists", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByTestId("preview-font-size").textContent).toBe("16px"));

    fireEvent.click(screen.getByTestId("preview-font-increase"));

    expect(screen.getByTestId("preview-font-size").textContent).toBe("17px");
    expect(document.documentElement.style.getPropertyValue("--preview-font-size")).toBe("17px");
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({ previewFontSize: 17 }),
        }),
      ),
    );
  });

  it("loads saved settings on startup", async () => {
    mockedInvoke.mockResolvedValue({ theme: "dark", editorFontSize: 18, previewFontSize: 20 });
    renderApp();

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(screen.getByTestId("editor-font-size").textContent).toBe("18px");
    expect(screen.getByTestId("preview-font-size").textContent).toBe("20px");
  });

  it("exposes semantic window and split setters that persist after loading", async () => {
    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("settings-loaded").textContent).toBe("true"));
    mockedInvoke.mockClear();

    fireEvent.click(screen.getByTestId("set-window-state"));
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            windowState: {
              width: 1280,
              height: 720,
              x: 24,
              y: 48,
              maximized: false,
            },
          }),
        }),
      ),
    );

    mockedInvoke.mockClear();
    fireEvent.click(screen.getByTestId("set-split-too-wide"));
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({ settings: expect.objectContaining({ splitRatio: 85 }) }),
      ),
    );
    expect(screen.getByTestId("split-ratio").textContent).toBe("85");

    mockedInvoke.mockClear();
    fireEvent.click(screen.getByTestId("set-split-too-narrow"));
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({ settings: expect.objectContaining({ splitRatio: 15 }) }),
      ),
    );
    expect(screen.getByTestId("split-ratio").textContent).toBe("15");
  });
});
