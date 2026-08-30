import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

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

function editorSource(editor: HTMLElement): string {
  return Array.from(editor.querySelectorAll(".cm-line"))
    .map((line) => line.textContent ?? "")
    .join("\n");
}

describe("preview task checkbox interaction", () => {
  it("renders accessible enabled controls and toggles the clicked nested task through App", async () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input");
    await setEditorText(
      editor,
      "- [ ] parent\n  - [x] nested\n\n- [ ] other",
    );

    const preview = screen.getByTestId("preview-pane");
    const checkboxes = preview.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[1].disabled).toBe(false);
    expect(checkboxes[1].getAttribute("aria-label")).toBe(
      "Toggle task on line 2",
    );

    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(editorSource(editor)).toBe(
        "- [ ] parent\n  - [ ] nested\n\n- [ ] other",
      );
      const updatedCheckboxes = preview.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      );
      expect(updatedCheckboxes).toHaveLength(3);
      expect(Array.from(updatedCheckboxes, (checkbox) => checkbox.checked)).toEqual([
        false,
        false,
        false,
      ]);
    });
    expect(screen.getByTestId("file-status").textContent).toContain("•");
  });

  it("keeps unsafe task content sanitized while preserving the interactive control", async () => {
    render(<App />);
    await setEditorText(
      screen.getByTestId("editor-input"),
      '- [ ] <img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>',
    );

    const preview = screen.getByTestId("preview-pane");
    expect(preview.querySelector('input[data-task-line="1"]')).not.toBeNull();
    expect(preview.querySelector("script")).toBeNull();
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.innerHTML).not.toContain("onerror=");
  });
});
