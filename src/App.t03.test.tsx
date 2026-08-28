import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "./App";
import { renderMarkdownBlocks } from "./lib/renderMarkdown";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(""),
}));

function renderApp() {
  return render(<App />);
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

  it("debounces preview rendering by ~150ms", () => {
    renderApp();
    const editor = screen.getByTestId("editor-input") as HTMLTextAreaElement;
    const preview = screen.getByTestId("preview-pane");
    // First change applies immediately (leading edge)…
    fireEvent.change(editor, { target: { value: "plain" } });
    expect(preview.querySelector("p")?.textContent).toBe("plain");
    // …subsequent changes within the window are debounced.
    fireEvent.change(editor, { target: { value: "# Hello" } });
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

  it("anchors preview scroll to the block under the editor caret", () => {
    renderApp();
    const editor = screen.getByTestId("editor-input") as HTMLTextAreaElement;
    const preview = screen.getByTestId("preview-pane") as HTMLElement;
    fireEvent.change(editor, {
      target: { value: "# One\n\npara one\n\n## Two\n\npara two" },
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const blocks = preview.querySelectorAll("[data-block-index]");
    expect(blocks.length).toBe(4);
    // jsdom cannot compute layout; stub the target block's offsetTop.
    Object.defineProperty(blocks[2], "offsetTop", { value: 123, configurable: true });
    editor.selectionStart = 20; // inside "## Two" (line 5)
    editor.selectionEnd = 20;
    fireEvent.select(editor);
    expect(preview.scrollTop).toBe(123);
  });
});
