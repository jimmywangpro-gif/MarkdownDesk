import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { renderMarkdownBlocks } from "./lib/renderMarkdown";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(""),
}));

const rangePrototype = Object.getPrototypeOf(document.createRange()) as object;
if (!("getClientRects" in rangePrototype)) {
  Object.defineProperty(rangePrototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
}

function renderApp() {
  return render(<App />);
}

async function setEditorText(editor: HTMLElement, value: string) {
  await act(async () => {
    if (editor instanceof HTMLTextAreaElement) {
      fireEvent.change(editor, { target: { value } });
    } else {
      editor.textContent = value;
      fireEvent.input(editor, { inputType: "insertText", data: value });
    }
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MarkdownDesk tri-mode split view (T03)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to split mode with both panes visible", () => {
    renderApp();
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
    expect(screen.getByTestId("mode-split").getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to edit-only mode via toolbar button", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("mode-edit"));
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.queryByTestId("preview-pane")).toBeNull();
    expect(screen.getByTestId("mode-edit").getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to view-only mode via toolbar button", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("mode-view"));
    expect(screen.queryByTestId("editor-pane")).toBeNull();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("switches modes with keyboard shortcuts (Cmd/Ctrl+1/2/3)", () => {
    renderApp();
    fireEvent.keyDown(window, { key: "2", ctrlKey: true });
    expect(screen.queryByTestId("editor-pane")).toBeNull();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
    fireEvent.keyDown(window, { key: "1", metaKey: true });
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.queryByTestId("preview-pane")).toBeNull();
    fireEvent.keyDown(window, { key: "3", ctrlKey: true });
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("switches modes with E/V/S shortcuts", () => {
    renderApp();
    fireEvent.keyDown(window, { key: "v" });
    expect(screen.queryByTestId("editor-pane")).toBeNull();
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.queryByTestId("preview-pane")).toBeNull();
    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("keeps plain-letter mode shortcuts out of the native textarea editor", () => {
    renderApp();
    const editor = screen.getByTestId("editor-input");

    fireEvent.keyDown(editor, { key: "v" });
    fireEvent.keyDown(editor, { key: "e" });
    fireEvent.keyDown(editor, { key: "s" });

    expect(screen.getByTestId("mode-split").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("debounces preview rendering by ~150ms", async () => {
    renderApp();
    const editor = screen.getByTestId("editor-input");
    const preview = screen.getByTestId("preview-pane");
    // First change applies immediately (leading edge)…
    await setEditorText(editor, "plain");
    expect(preview.querySelector("p")?.textContent).toBe("plain");
    // …subsequent changes within the window are debounced.
    await setEditorText(editor, "# Hello");
    expect(preview.querySelector("h1")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(preview.querySelector("h1")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(preview.querySelector("h1")?.textContent).toBe("Hello");
  });

  it("starts a new immediate burst after a single edit goes idle", async () => {
    renderApp();
    const editor = screen.getByTestId("editor-input");
    const preview = screen.getByTestId("preview-pane");

    await setEditorText(editor, "plain");
    expect(preview.querySelector("p")?.textContent).toBe("plain");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    await setEditorText(editor, "# After idle");
    expect(preview.querySelector("h1")?.textContent).toBe("After idle");
  });

  it("renders data-block-index anchors on top-level blocks", () => {
    const { html, blocks } = renderMarkdownBlocks("# One\n\npara one\n\n## Two\n\n- a\n- b");
    expect(html).toContain('data-block-index="0"');
    expect(html).toContain('data-block-index="1"');
    expect(html).toContain('data-block-index="2"');
    expect(html).toContain('data-block-index="3"');
    expect(blocks).toEqual([
      { index: 0, startLine: 1 },
      { index: 1, startLine: 3 },
      { index: 2, startLine: 5 },
      { index: 3, startLine: 7 },
    ]);
  });

  it("anchors preview scroll to the block under the editor caret", async () => {
    renderApp();
    const editor = screen.getByTestId("editor-input");
    const preview = screen.getByTestId("preview-pane") as HTMLElement;
    await setEditorText(editor, "# One\n\npara one\n\n## Two\n\npara two");
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const blocks = preview.querySelectorAll("[data-block-index]");
    expect(blocks.length).toBe(4);
    // jsdom cannot compute layout; stub the target block's offsetTop.
    const originalOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetTop");
    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get() {
        return this.getAttribute("data-block-index") === "3" ? 123 : 0;
      },
    });
    editor.focus();
    fireEvent.keyDown(editor, { key: "End", ctrlKey: true });
    expect(preview.scrollTop).toBe(123);
    if (originalOffsetTop) {
      Object.defineProperty(HTMLElement.prototype, "offsetTop", originalOffsetTop);
    } else {
      delete (HTMLElement.prototype as { offsetTop?: number }).offsetTop;
    }
  });
});
