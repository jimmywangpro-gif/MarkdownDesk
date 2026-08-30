import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
// @ts-expect-error node:fs is provided by the Vitest runtime.
import { readFileSync } from "node:fs";
import App from "./App";

const appCss = readFileSync("src/App.css", "utf8");

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

let appStyle: HTMLStyleElement;

describe("R09 workspace layout and accessibility", () => {
  beforeEach(() => {
    appStyle = document.createElement("style");
    appStyle.textContent = appCss;
    document.head.appendChild(appStyle);
  });

  afterEach(() => {
    appStyle.remove();
  });

  it("keeps the requested editor ratio fixed while preview consumes the remainder", () => {
    render(<App />);

    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    const preview = screen.getByTestId("preview-pane") as HTMLElement;

    expect(editor.style.flexBasis).toBe("33.3333%");
    expect(getComputedStyle(editor).flexGrow).toBe("0");
    expect(getComputedStyle(editor).flexShrink).toBe("0");
    expect(getComputedStyle(preview).flexGrow).toBe("1");
    expect(getComputedStyle(preview).flexShrink).toBe("1");
    expect(["0%", "0px", "0"]).toContain(getComputedStyle(preview).flexBasis);
  });

  it("resizes the fixed editor pane by keyboard steps and clamps at both limits", () => {
    render(<App />);
    const divider = screen.getByTestId("split-divider");
    const editor = screen.getByTestId("editor-pane") as HTMLElement;

    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(editor.style.flexBasis).toBe("28.3333%");
    expect(divider.getAttribute("aria-valuenow")).toBe("28.3333");
    expect(getComputedStyle(editor).flexGrow).toBe("0");
    expect(getComputedStyle(editor).flexShrink).toBe("0");

    for (let step = 0; step < 4; step += 1) {
      fireEvent.keyDown(divider, { key: "ArrowLeft" });
    }
    expect(editor.style.flexBasis).toBe("15%");
    expect(divider.getAttribute("aria-valuenow")).toBe("15");

    for (let step = 0; step < 14; step += 1) {
      fireEvent.keyDown(divider, { key: "ArrowRight" });
    }
    expect(editor.style.flexBasis).toBe("85%");
    expect(divider.getAttribute("aria-valuenow")).toBe("85");
  });

  it("resizes from pointer position and clamps the mouse ratio to the supported range", () => {
    render(<App />);
    const divider = screen.getByTestId("split-divider");
    const editor = screen.getByTestId("editor-pane") as HTMLElement;
    const workspace = divider.parentElement as HTMLElement;
    Object.defineProperty(workspace, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 100, width: 800, top: 0, height: 600 }),
    });

    fireEvent.mouseDown(divider, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 500 });
    expect(editor.style.flexBasis).toBe("50%");
    expect(divider.getAttribute("aria-valuenow")).toBe("50");

    fireEvent.mouseMove(window, { clientX: 0 });
    expect(editor.style.flexBasis).toBe("15%");
    expect(divider.getAttribute("aria-valuenow")).toBe("15");

    fireEvent.mouseMove(window, { clientX: 1_000 });
    expect(editor.style.flexBasis).toBe("85%");
    expect(divider.getAttribute("aria-valuenow")).toBe("85");
    fireEvent.mouseUp(window);
  });

  it("exposes the vertical separator range and current ratio to assistive technology", () => {
    render(<App />);
    const divider = screen.getByTestId("split-divider");

    expect(divider.getAttribute("role")).toBe("separator");
    expect(divider.getAttribute("aria-orientation")).toBe("vertical");
    expect(divider.getAttribute("aria-valuemin")).toBe("15");
    expect(divider.getAttribute("aria-valuemax")).toBe("85");
    expect(divider.getAttribute("aria-valuenow")).toBe("33.3333");
    expect(divider.getAttribute("tabindex")).toBe("0");
  });

  it("gives the CodeMirror content surface the Markdown editor accessible name", () => {
    render(<App />);

    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.classList.contains("cm-content")).toBe(true);
  });

  it("keeps the toolbar in one row and horizontally scrollable at narrow widths", () => {
    render(<App />);

    const toolbar = screen.getByTestId("toolbar");
    const styles = getComputedStyle(toolbar);
    expect(styles.flexWrap).toBe("nowrap");
    expect(styles.overflowX).toBe("auto");
  });
});
