import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

async function setEditorText(editor: HTMLElement, value: string) {
  await act(async () => {
    editor.textContent = value;
    fireEvent.input(editor, { inputType: "insertText", data: value });
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MarkdownEditor", () => {
  it("renders a labelled, keyboard-accessible Markdown contenteditable", () => {
    render(<MarkdownEditor value="# Heading" onChange={vi.fn()} />);

    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.textContent).toBe("# Heading");
  });

  it("reports user edits once and applies a new source without feedback", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MarkdownEditor value="before" onChange={onChange} />);
    const editor = screen.getByTestId("editor-input");

    await setEditorText(editor, "typed");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("typed");

    rerender(<MarkdownEditor value="opened from disk" onChange={onChange} />);
    expect(editor.textContent).toBe("opened from disk");
    expect(onChange).toHaveBeenCalledOnce();
  });
});
