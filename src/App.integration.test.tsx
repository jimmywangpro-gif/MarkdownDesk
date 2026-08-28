import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import App from "./App";
import { saveHtmlFile } from "./lib/exportHtml";
import { printPdf } from "./lib/printPdf";

const eventMocks = vi.hoisted(() => ({
  listen: vi.fn(),
  openFileHandler: undefined as
    | ((event: { payload: string }) => void)
    | undefined,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: eventMocks.listen,
}));

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
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

vi.mock("./lib/exportHtml", () => ({
  saveHtmlFile: vi.fn(),
}));

vi.mock("./lib/printPdf", () => ({
  printPdf: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);
const mockedOpenUrl = vi.mocked(openUrl);
const mockedSaveHtmlFile = vi.mocked(saveHtmlFile);
const mockedPrintPdf = vi.mocked(printPdf);

describe("App integration seams (T09)", () => {
  beforeEach(() => {
    eventMocks.listen.mockReset();
    eventMocks.openFileHandler = undefined;
    eventMocks.listen.mockImplementation(
      async (
        event: string,
        handler: (event: { payload: string }) => void,
      ) => {
        if (event === "open-file") eventMocks.openFileHandler = handler;
        return vi.fn();
      },
    );
    webviewMocks.onDragDropEvent.mockReset();
    webviewMocks.dropHandler = undefined;
    webviewMocks.onDragDropEvent.mockImplementation(
      async (handler: NonNullable<typeof webviewMocks.dropHandler>) => {
        webviewMocks.dropHandler = handler;
        return vi.fn();
      },
    );
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "recent_files_list") return [];
      return undefined;
    });
    mockedOpenUrl.mockReset();
    mockedSaveHtmlFile.mockReset();
    mockedSaveHtmlFile.mockResolvedValue({ status: "cancelled" });
    mockedPrintPdf.mockReset();
  });

  it("wires the HTML export and native print seams to toolbar actions", async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("export-html-button"));
    await waitFor(() => expect(mockedSaveHtmlFile).toHaveBeenCalledOnce());
    expect(mockedSaveHtmlFile).toHaveBeenCalledWith(
      "# MarkdownDesk\n\nStart typing…",
      undefined,
    );

    fireEvent.click(screen.getByTestId("mode-edit"));
    fireEvent.click(screen.getByTestId("print-pdf-button"));
    await waitFor(() => expect(mockedPrintPdf).toHaveBeenCalledOnce());
    expect(mockedPrintPdf).toHaveBeenCalledWith({
      mode: "edit",
      setMode: expect.any(Function),
    });
  });

  it("opens a dropped Markdown file through the existing file seam", async () => {
    render(<App />);
    const file = new File(["# Dropped"], "dropped.md", { type: "text/markdown" });
    Object.defineProperty(file, "path", { value: "/tmp/dropped.md" });
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "recent_files_list") return [];
      if (command === "read_file") {
        return { path: "/tmp/dropped.md", content: "# Dropped", mtime: 2 };
      }
      return undefined;
    });

    fireEvent.drop(screen.getByTestId("app-root"), {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect((screen.getByTestId("editor-input") as HTMLTextAreaElement).value).toBe("# Dropped");
    });
    expect(mockedInvoke).toHaveBeenCalledWith("read_file", { path: "/tmp/dropped.md" });
  });

  it("opens a Markdown path delivered by Tauri native drag and drop", async () => {
    render(<App />);
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "recent_files_list") return [];
      if (command === "read_file") {
        return { path: "/tmp/native-drop.md", content: "# Native drop", mtime: 4 };
      }
      return undefined;
    });

    await waitFor(() => expect(webviewMocks.dropHandler).toBeTypeOf("function"));
    webviewMocks.dropHandler?.({
      payload: { type: "drop", paths: ["/tmp/native-drop.md"] },
    });

    await waitFor(() => {
      expect((screen.getByTestId("editor-input") as HTMLTextAreaElement).value).toBe(
        "# Native drop",
      );
    });
    expect(mockedInvoke).toHaveBeenCalledWith("read_file", { path: "/tmp/native-drop.md" });
  });

  it("opens a Markdown file delivered by the native file association event", async () => {
    render(<App />);
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "recent_files_list") return [];
      if (command === "read_file") {
        return { path: "/tmp/from-finder.md", content: "# Finder", mtime: 3 };
      }
      return undefined;
    });

    await waitFor(() => expect(eventMocks.openFileHandler).toBeTypeOf("function"));
    eventMocks.openFileHandler?.({ payload: "/tmp/from-finder.md" });

    await waitFor(() => {
      expect((screen.getByTestId("editor-input") as HTMLTextAreaElement).value).toBe("# Finder");
    });
    expect(mockedInvoke).toHaveBeenCalledWith("read_file", { path: "/tmp/from-finder.md" });
  });

  it("routes preview external links to the system opener", async () => {
    render(<App />);
    const editor = screen.getByTestId("editor-input");
    fireEvent.change(editor, { target: { value: "[Docs](https://example.com/docs)" } });

    fireEvent.click(screen.getByRole("link", { name: "Docs" }));

    await waitFor(() => expect(mockedOpenUrl).toHaveBeenCalledWith("https://example.com/docs"));
  });
});
