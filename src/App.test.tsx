import { describe, it, expect, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";

// T01 tracer-bullet 元件測試：編輯/預覽雙窗格 + 最小即時渲染。
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

async function setEditorText(editor: HTMLElement, value: string) {
  await act(async () => {
    editor.textContent = value;
    fireEvent.input(editor, { inputType: "insertText", data: value });
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MarkdownDesk App (T01 tracer bullet)", () => {
  it("renders editor and preview panes", () => {
    render(<App />);
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("renders an accessible CodeMirror contenteditable editor", () => {
    render(<App />);
    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.getAttribute("data-testid")).toBe("editor-input");
  });

  it("renders # Hello as h1 in preview (tracer bullet)", async () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input");
    await setEditorText(editor, "# Hello");
    const preview = screen.getByTestId("preview-pane");
    const h1 = preview.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Hello");
  });

  it("shows preview updating live while typing", async () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input");
    await setEditorText(editor, "hello world");
    const preview = screen.getByTestId("preview-pane");
    expect(preview.querySelector("p")?.textContent).toBe("hello world");
  });

  it("keeps Cmd/Ctrl+S working while the contenteditable has focus", async () => {
    render(<App />);
    vi.mocked(invoke).mockClear();
    const editor = screen.getByTestId("editor-input");

    fireEvent.keyDown(editor, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith("save_file_as", {
        content: "# MarkdownDesk\n\nStart typing…",
      });
    });
  });
});
