import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const MAX_MARKDOWN_SOURCE_BYTES = 8 * 1024 * 1024;
const OVERSIZED_MARKDOWN_SOURCE = "x".repeat(MAX_MARKDOWN_SOURCE_BYTES + 1);

const fileOpsMocks = vi.hoisted(() => ({
  onFileChanged: vi.fn(),
  onFileOpened: vi.fn(),
  openFile: vi.fn(),
  readFile: vi.fn(),
  recentFilesAdd: vi.fn(),
  recentFilesClear: vi.fn(),
  recentFilesList: vi.fn(),
  saveFile: vi.fn(),
  saveFileAs: vi.fn(),
  unwatchFile: vi.fn(),
  watchFile: vi.fn(),
}));

vi.mock("./lib/fileOps", () => fileOpsMocks);

const renderMocks = vi.hoisted(() => ({
  maxSourceBytes: 8 * 1024 * 1024,
  sources: [] as string[],
}));

vi.mock("./lib/renderMarkdown", async () => {
  const actual = await vi.importActual<typeof import("./lib/renderMarkdown")>(
    "./lib/renderMarkdown",
  );

  return {
    ...actual,
    renderMarkdownBlocks: vi.fn((source: string) => {
      renderMocks.sources.push(source);
      // Keep the RED test itself cheap if App hands the oversized source to the
      // renderer. The assertion below still observes that forbidden handoff.
      if (source.length > renderMocks.maxSourceBytes) {
        return { html: "", blocks: [], tasks: [] };
      }
      return actual.renderMarkdownBlocks(source);
    }),
  };
});

const editorMocks = vi.hoisted(() => ({
  values: [] as string[],
}));

vi.mock("./components/MarkdownEditor", () => ({
  MarkdownEditor: vi.fn(
    ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string) => void;
    }) => {
      editorMocks.values.push(value);
      return (
        <textarea
          data-testid="editor-input"
          aria-label="Markdown editor"
          value={value.length > MAX_MARKDOWN_SOURCE_BYTES ? "" : value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      );
    },
  ),
}));

const webviewMocks = vi.hoisted(() => ({
  onDragDropEvent: vi.fn(),
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: webviewMocks.onDragDropEvent }),
}));

function openedFile(path: string, content: string) {
  return { path, content, mtime: 1 };
}

describe("R10 large Markdown open guard (macOS)", () => {
  beforeEach(() => {
    fileOpsMocks.onFileChanged.mockReset();
    fileOpsMocks.onFileOpened.mockReset();
    fileOpsMocks.openFile.mockReset();
    fileOpsMocks.readFile.mockReset();
    fileOpsMocks.recentFilesAdd.mockReset();
    fileOpsMocks.recentFilesClear.mockReset();
    fileOpsMocks.recentFilesList.mockReset();
    fileOpsMocks.saveFile.mockReset();
    fileOpsMocks.saveFileAs.mockReset();
    fileOpsMocks.unwatchFile.mockReset();
    fileOpsMocks.watchFile.mockReset();
    fileOpsMocks.onFileChanged.mockResolvedValue(vi.fn());
    fileOpsMocks.onFileOpened.mockResolvedValue(vi.fn());
    fileOpsMocks.openFile.mockResolvedValue(null);
    fileOpsMocks.readFile.mockRejectedValue(new Error("read failed"));
    fileOpsMocks.recentFilesAdd.mockResolvedValue(undefined);
    fileOpsMocks.recentFilesClear.mockResolvedValue(undefined);
    fileOpsMocks.recentFilesList.mockResolvedValue([]);
    fileOpsMocks.saveFile.mockResolvedValue({ path: "/tmp/current.md", mtime: 2 });
    fileOpsMocks.saveFileAs.mockResolvedValue(null);
    fileOpsMocks.unwatchFile.mockResolvedValue(undefined);
    fileOpsMocks.watchFile.mockResolvedValue(undefined);

    renderMocks.sources.length = 0;
    editorMocks.values.length = 0;
    webviewMocks.onDragDropEvent.mockReset().mockResolvedValue(vi.fn());
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects a source above 8 MiB before handing it to CodeMirror or the renderer", async () => {
    fileOpsMocks.openFile.mockResolvedValue(
      openedFile("/tmp/too-large.md", OVERSIZED_MARKDOWN_SOURCE),
    );
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-button"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const status = screen.queryByTestId("operation-status");
    expect(status).not.toBeNull();
    if (!status) return;
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toMatch(/檔案|Markdown/);
    expect(status.textContent).toMatch(/過大|超過|上限/);
    expect(status.textContent).toMatch(/8\s*MiB/);
    expect(fileOpsMocks.openFile).toHaveBeenCalledOnce();
    expect(editorMocks.values).not.toContain(OVERSIZED_MARKDOWN_SOURCE);
    expect(renderMocks.sources).not.toContain(OVERSIZED_MARKDOWN_SOURCE);
    expect(fileOpsMocks.recentFilesAdd).not.toHaveBeenCalled();
    expect(fileOpsMocks.watchFile).not.toHaveBeenCalled();
    expect(screen.getByTestId("file-status").textContent).not.toContain(
      "/tmp/too-large.md",
    );
  });

  it("preserves the current dirty source when an oversized open is rejected", async () => {
    const currentSource = "edited before opening a large file";
    fileOpsMocks.openFile.mockResolvedValue(
      openedFile("/tmp/too-large.md", OVERSIZED_MARKDOWN_SOURCE),
    );
    render(<App />);

    fireEvent.change(screen.getByTestId("editor-input"), {
      target: { value: currentSource },
    });
    await waitFor(() =>
      expect(screen.getByTestId("file-status").textContent).toContain("•"),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-button"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByTestId("operation-status")).not.toBeNull();
    expect(screen.getByTestId("preview-pane").textContent).toContain(currentSource);
    expect(screen.getByTestId("file-status").textContent).toContain("未命名");
    expect(screen.getByTestId("file-status").textContent).toContain("•");
    expect(editorMocks.values).not.toContain(OVERSIZED_MARKDOWN_SOURCE);
    expect(renderMocks.sources).not.toContain(OVERSIZED_MARKDOWN_SOURCE);
  });
});
