import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const rangePrototype = Object.getPrototypeOf(document.createRange()) as object;
if (!("getClientRects" in rangePrototype)) {
  Object.defineProperty(rangePrototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
}

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
  fileChangedHandler: undefined as ((path: string) => void) | undefined,
  fileOpenedHandler: undefined as ((path: string) => void) | undefined,
}));

vi.mock("./lib/fileOps", () => fileOpsMocks);

const webviewMocks = vi.hoisted(() => ({
  onDragDropEvent: vi.fn(),
  dropHandler: undefined as
    | ((event: {
        payload:
          | { type: "drop"; paths: string[] }
          | { type: "over" }
          | { type: "enter"; paths: string[] }
          | { type: "leave" };
      }) => void)
    | undefined,
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: webviewMocks.onDragDropEvent }),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

function openedFile(path: string, content: string, mtime: number) {
  return { path, content, mtime };
}

async function setEditorText(value: string) {
  const editor = screen.getByTestId("editor-input");
  await act(async () => {
    editor.textContent = value;
    fireEvent.input(editor, { inputType: "insertText", data: value });
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("App file lifecycle remediation", () => {
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
    fileOpsMocks.fileChangedHandler = undefined;
    fileOpsMocks.fileOpenedHandler = undefined;

    fileOpsMocks.onFileChanged.mockImplementation(async (handler: (path: string) => void) => {
      fileOpsMocks.fileChangedHandler = handler;
      return vi.fn();
    });
    fileOpsMocks.onFileOpened.mockImplementation(async (handler: (path: string) => void) => {
      fileOpsMocks.fileOpenedHandler = handler;
      return vi.fn();
    });
    fileOpsMocks.openFile.mockResolvedValue(null);
    fileOpsMocks.readFile.mockRejectedValue(new Error("read failed"));
    fileOpsMocks.recentFilesAdd.mockResolvedValue(undefined);
    fileOpsMocks.recentFilesClear.mockResolvedValue(undefined);
    fileOpsMocks.recentFilesList.mockResolvedValue([]);
    fileOpsMocks.saveFile.mockResolvedValue({ path: "/tmp/current.md", mtime: 2 });
    fileOpsMocks.saveFileAs.mockResolvedValue(null);
    fileOpsMocks.unwatchFile.mockResolvedValue(undefined);
    fileOpsMocks.watchFile.mockResolvedValue(undefined);

    webviewMocks.onDragDropEvent.mockReset();
    webviewMocks.dropHandler = undefined;
    webviewMocks.onDragDropEvent.mockImplementation(
      async (handler: NonNullable<typeof webviewMocks.dropHandler>) => {
        webviewMocks.dropHandler = handler;
        return vi.fn();
      },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("establishes B before retiring A and does not duplicate an unchanged watcher", async () => {
    fileOpsMocks.readFile.mockImplementation(async (path: string) =>
      path === "/tmp/a.md"
        ? openedFile(path, "# A", 1)
        : openedFile(path, "# B", 2),
    );
    render(<App />);
    await waitFor(() => expect(fileOpsMocks.fileOpenedHandler).toBeTypeOf("function"));

    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/a.md"));
    await waitFor(() => expect(screen.getByTestId("editor-input").textContent).toBe("# A"));

    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/b.md"));
    await waitFor(() => expect(screen.getByTestId("editor-input").textContent).toBe("# B"));

    expect(fileOpsMocks.watchFile).toHaveBeenNthCalledWith(1, "/tmp/a.md");
    expect(fileOpsMocks.watchFile).toHaveBeenNthCalledWith(2, "/tmp/b.md");
    expect(fileOpsMocks.unwatchFile).toHaveBeenCalledOnce();
    expect(fileOpsMocks.unwatchFile).toHaveBeenCalledWith("/tmp/a.md");
    expect(fileOpsMocks.watchFile.mock.invocationCallOrder[1]).toBeLessThan(
      fileOpsMocks.unwatchFile.mock.invocationCallOrder[0],
    );

    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/b.md"));
    expect(fileOpsMocks.watchFile).toHaveBeenCalledTimes(2);
  });

  it("renders read failures and preserves edited source", async () => {
    render(<App />);
    await setEditorText("edited before read failure");
    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/missing.md"));

    await waitFor(() => expect(screen.getByTestId("operation-status").textContent).toContain("開啟檔案失敗"));
    expect(screen.getByTestId("preview-pane").textContent).toContain("edited before read failure");
  });

  it("renders save failures and preserves edited source", async () => {
    fileOpsMocks.saveFileAs.mockRejectedValue(new Error("disk full"));
    render(<App />);
    await setEditorText("edited before save failure");

    fireEvent.click(screen.getByTestId("save-button"));

    await waitFor(() => expect(screen.getByTestId("operation-status").textContent).toContain("儲存失敗"));
    expect(screen.getByTestId("preview-pane").textContent).toContain("edited before save failure");
  });

  it("reports external reload read failures without clearing edited source", async () => {
    fileOpsMocks.readFile.mockResolvedValue(openedFile("/tmp/live.md", "# Live", 10));
    render(<App />);
    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/live.md"));
    await waitFor(() => expect(screen.getByTestId("editor-input").textContent).toBe("# Live"));
    await setEditorText("edited before external failure");
    await waitFor(() =>
      expect(screen.getByTestId("preview-pane").textContent).toContain("edited before external failure"),
    );
    fileOpsMocks.readFile.mockRejectedValue(new Error("external read failed"));

    await act(async () => fileOpsMocks.fileChangedHandler?.("/tmp/live.md"));

    await waitFor(() =>
      expect(screen.getByTestId("operation-status").textContent).toContain("重新載入失敗"),
    );
    expect(screen.getByTestId("preview-pane").textContent).toContain("edited before external failure");
  });

  it("updates the mtime boundary before an own-save watcher event can prompt", async () => {
    fileOpsMocks.readFile.mockResolvedValue(openedFile("/tmp/live.md", "# Live", 10));
    fileOpsMocks.saveFile.mockResolvedValue({ path: "/tmp/live.md", mtime: 20 });
    render(<App />);
    await act(async () => fileOpsMocks.fileOpenedHandler?.("/tmp/live.md"));
    await waitFor(() => expect(screen.getByTestId("editor-input").textContent).toBe("# Live"));
    await setEditorText("edited");

    fireEvent.click(screen.getByTestId("save-button"));
    await waitFor(() => expect(fileOpsMocks.saveFile).toHaveBeenCalledWith("/tmp/live.md", "edited"));

    fileOpsMocks.readFile.mockResolvedValue(openedFile("/tmp/live.md", "edited", 20));
    await act(async () => fileOpsMocks.fileChangedHandler?.("/tmp/live.md"));
    await Promise.resolve();

    expect(window.confirm).not.toHaveBeenCalledWith("檔案已在外部被修改，是否重新載入？");
  });
});
