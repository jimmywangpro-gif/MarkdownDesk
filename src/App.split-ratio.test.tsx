import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsProvider } from "./lib/SettingsContext";
import App from "./App";

const windowApi = vi.hoisted(() => {
  const currentWindow = {
    outerSize: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
    outerPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    isMaximized: vi.fn().mockResolvedValue(false),
    setSize: vi.fn().mockResolvedValue(undefined),
    setPosition: vi.fn().mockResolvedValue(undefined),
    maximize: vi.fn().mockResolvedValue(undefined),
    unmaximize: vi.fn().mockResolvedValue(undefined),
    onResized: vi.fn().mockResolvedValue(vi.fn()),
    onMoved: vi.fn().mockResolvedValue(vi.fn()),
    onCloseRequested: vi.fn().mockResolvedValue(vi.fn()),
  };
  return { getCurrentWindow: vi.fn(() => currentWindow), currentWindow };
});

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: windowApi.getCurrentWindow,
}));

// T13 resizable split: default editor:preview = 1:2, drag the divider to
// resize, keyboard arrows adjust by 5% steps, and the ratio persists via
// save_settings (windowState-like field reused: splitRatio on settings).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

const rangePrototype = Object.getPrototypeOf(document.createRange()) as object;
if (!("getClientRects" in rangePrototype)) {
  Object.defineProperty(rangePrototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
}

describe("resizable split view (T13)", () => {
  it("renders a divider between editor and preview panes", () => {
    render(<App />);
    expect(screen.getByTestId("split-divider")).toBeTruthy();
  });

  it("defaults the editor pane to one third (1:2 ratio)", () => {
    render(<App />);
    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    expect(editor.style.flexBasis).toBe("33.3333%");
  });

  it("resizes panes when the divider is dragged", () => {
    render(<App />);
    const divider = screen.getByTestId("split-divider");
    const workspace = divider.parentElement as HTMLElement;
    Object.defineProperty(workspace, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 900, top: 0, height: 600 }),
      configurable: true,
    });

    fireEvent.mouseDown(divider, { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 450 });
    fireEvent.mouseUp(window);

    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    expect(editor.style.flexBasis).toBe("50%");
  });

  it("adjusts the ratio with keyboard arrows on the divider", () => {
    render(<App />);
    const divider = screen.getByTestId("split-divider");
    expect(divider.getAttribute("tabindex")).toBe("0");
    expect(divider.getAttribute("aria-valuemin")).toBe("15");
    expect(divider.getAttribute("aria-valuemax")).toBe("85");
    expect(divider.getAttribute("aria-valuenow")).toBe("33.3333");

    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    expect(editor.style.flexBasis).toBe("28.3333%");

    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(editor.style.flexBasis).toBe("33.3333%");
  });

  it("restores the persisted ratio and persists keyboard changes", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "load_settings") return { splitRatio: 62.5 };
      return null;
    });

    render(
      <SettingsProvider>
        <App />
      </SettingsProvider>,
    );

    await waitFor(() => {
      expect((screen.getByTestId("editor-pane") as HTMLElement).style.flexBasis).toBe("62.5%");
    });

    vi.mocked(invoke).mockClear();
    fireEvent.keyDown(screen.getByTestId("split-divider"), { key: "ArrowRight" });

    expect((screen.getByTestId("editor-pane") as HTMLElement).style.flexBasis).toBe("67.5%");
    await waitFor(() =>
      expect(vi.mocked(invoke)).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({ splitRatio: 67.5 }),
        }),
      ),
    );
  });
});
