import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  renderMarkdown,
  saveHtmlFile,
  type HtmlExportResult,
} from "./exportHtml";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe("exportHtml standalone document", () => {
  it("wraps the sanitized markdown fragment in a complete offline document", () => {
    const html = renderMarkdown(
      "# Hello & world\n\n```js\nconst answer = 42;\n```",
      "notes.md",
    );

    expect(html).toMatch(/^<!DOCTYPE html>\n<html lang="en">/);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
    expect(html).toContain("<main class=\"markdown-body\">");
    expect(html).toContain("<h1>Hello &amp; world</h1>");
    expect(html).toContain('<title>Hello &amp; world</title>');
    expect(html).toContain(".hljs-keyword");
    expect(html).toContain(".hljs-number");
    expect(html).not.toMatch(/<script\b/i);
  });

  it("uses the source file name when there is no h1", () => {
    const html = renderMarkdown("A document without a heading", "/tmp/notes.md");

    expect(html).toContain("<title>notes.md</title>");
  });

  it("keeps sanitize guarantees from the shared markdown renderer", () => {
    const html = renderMarkdown(
      '<script>alert("x")</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert(1))',
    );

    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toContain("onerror=");
    expect(html).not.toContain("javascript:");
  });
});

describe("saveHtmlFile", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
  });

  it("reports a successful dialog and write as saved", async () => {
    mockedInvoke
      .mockResolvedValueOnce("/tmp/notes.html")
      .mockResolvedValueOnce(undefined);

    const result = await saveHtmlFile("# Notes", "notes.md");

    expect(result).toEqual({ status: "saved", path: "/tmp/notes.html" });
    expect(mockedInvoke).toHaveBeenNthCalledWith(
      1,
      "export_html_save_dialog",
      { suggestedFileName: "notes.html" },
    );
    expect(mockedInvoke).toHaveBeenNthCalledWith(
      2,
      "save_text_file",
      expect.objectContaining({ path: "/tmp/notes.html" }),
    );
    expect(mockedInvoke.mock.calls[1]?.[1]).toMatchObject({
      content: expect.stringContaining("<!DOCTYPE html>"),
    });
  });

  it("reports cancellation without attempting a write", async () => {
    mockedInvoke.mockResolvedValueOnce(null);

    const result = await saveHtmlFile("# Notes");

    expect(result).toEqual({ status: "cancelled" });
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
  });

  it("reports dialog and write failures distinctly from cancellation", async () => {
    mockedInvoke
      .mockResolvedValueOnce("/tmp/notes.html")
      .mockRejectedValueOnce(new Error("disk full"));

    const result: HtmlExportResult = await saveHtmlFile("# Notes");

    expect(result).toEqual({ status: "error", error: "disk full" });
  });
});
