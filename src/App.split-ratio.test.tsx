import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// T13 resizable split: default editor:preview = 1:2, drag the divider to
// resize, keyboard arrows adjust by 5% steps, and the ratio persists via
// save_settings (windowState-like field reused: splitRatio on settings).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

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

    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    expect(editor.style.flexBasis).toBe("28.3333%");

    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(editor.style.flexBasis).toBe("33.3333%");
  });
});