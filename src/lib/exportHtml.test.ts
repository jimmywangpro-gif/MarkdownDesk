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

  it("exports the GFM table wrapper and alignment classes as a markup golden", () => {
    const html = renderMarkdown(
      "| left | right | center |\n| :- | -: | :-: |\n| 1 | 2 | 3 |",
    );

    expect(html).toContain(
      `<div class="table-wrapper"><table>
<thead>
<tr>
<th class="align-left">left</th>
<th class="align-right">right</th>
<th class="align-center">center</th>
</tr>
</thead>
<tbody>
<tr>
<td class="align-left">1</td>
<td class="align-right">2</td>
<td class="align-center">3</td>
</tr>
</tbody>
</table></div>`,
    );
  });

  it("exports table wrapper and alignment styles matching the preview", () => {
    const html = renderMarkdown(
      "| left | right | center |\n| :- | -: | :-: |\n| 1 | 2 | 3 |",
    );
    const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";

    expect(style).toContain(`
.markdown-body .table-wrapper {
  overflow-x: auto;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  margin: 0.75em 0;
}

.markdown-body .table-wrapper table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.95em;
}

.markdown-body .table-wrapper th,
.markdown-body .table-wrapper td {
  border-bottom: 1px solid #d0d0d0;
  padding: 0.45em 0.75em;
  text-align: left;
}`);
    expect(style).toContain(`
.markdown-body .table-wrapper thead th {
  background-color: rgba(0, 0, 0, 0.06);
  font-weight: 600;
}`);
    expect(style).toContain(`
.markdown-body .table-wrapper tbody tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.06);
}`);
    expect(style).toContain(`
.markdown-body .table-wrapper th.align-left,
.markdown-body .table-wrapper td.align-left {
  text-align: left;
}

.markdown-body .table-wrapper th.align-right,
.markdown-body .table-wrapper td.align-right {
  text-align: right;
}

.markdown-body .table-wrapper th.align-center,
.markdown-body .table-wrapper td.align-center {
  text-align: center;
}`);
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

  it("keeps executable elements, handlers, and dangerous protocols out of export", () => {
    const html = renderMarkdown(
      [
        "# Safe",
        "",
        '<base href="https://evil.example/">',
        '<script>alert("x")</script>',
        '<div onmouseover="alert(1)">[bad](javascript:alert(1))</div>',
        "",
        "[safe](https://example.com)",
      ].join("\n"),
    );

    expect(html).toContain("<h1>Safe</h1>");
    expect(html).toContain('<a href="https://example.com">safe</a>');
    expect(html).not.toMatch(/<(?:base|script|iframe|object)\b/i);
    expect(html).not.toMatch(/\bon[a-z-]+\s*=/i);
    expect(html).not.toMatch(/(?:href|src)="(?:javascript:|data:text\/html)/i);
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
