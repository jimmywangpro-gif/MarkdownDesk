import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// T01 tracer-bullet 元件測試：編輯/預覽雙窗格 + 最小即時渲染。
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(""),
}));

describe("MarkdownDesk App (T01 tracer bullet)", () => {
  it("renders editor and preview panes", () => {
    render(<App />);
    expect(screen.getByTestId("editor-pane")).toBeTruthy();
    expect(screen.getByTestId("preview-pane")).toBeTruthy();
  });

  it("renders # Hello as h1 in preview (tracer bullet)", () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "# Hello" } });
    const preview = screen.getByTestId("preview-pane");
    const h1 = preview.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Hello");
  });

  it("shows preview updating live while typing", () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "hello world" } });
    const preview = screen.getByTestId("preview-pane");
    expect(preview.querySelector("p")?.textContent).toBe("hello world");
  });
});