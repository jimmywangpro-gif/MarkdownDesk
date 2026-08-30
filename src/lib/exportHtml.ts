import { invoke } from "@tauri-apps/api/core";
import { renderMarkdown as renderMarkdownFragment } from "./renderMarkdown";

/** Options shared by HTML rendering and the native export seam. */
export interface ExportHtmlOptions {
  /** Source file path or name, used for the document title/fallback name. */
  fileName?: string;
  /** Optional explicit document title. The first Markdown h1 wins otherwise. */
  title?: string;
}

type ExportHtmlInput = string | ExportHtmlOptions | undefined;

export type HtmlExportResult =
  | { status: "saved"; path: string }
  | { status: "cancelled" }
  | { status: "error"; error: string };

const DEFAULT_TITLE = "MarkdownDesk";
const DEFAULT_FILE_NAME = "untitled.html";

// These rules intentionally mirror the preview's typography, spacing, and
// highlight.js palette. There are no external font, stylesheet, or script
// dependencies, so an exported file remains useful when opened offline.
const INLINE_STYLES = `
:root {
  color: #0f0f0f;
  background: #f6f6f6;
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 1.25rem;
}

.markdown-body {
  max-width: 65ch;
  margin: 0 auto;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  line-height: 1.25;
  margin: 1em 0 0.5em;
}

.markdown-body p { margin: 0.5em 0; }
.markdown-body a { color: #0969da; }
.markdown-body blockquote {
  margin: 1em 0;
  padding: 0 1em;
  color: #656d76;
  border-left: 0.25em solid #d0d7de;
}
.markdown-body ul,
.markdown-body ol { padding-left: 2em; }

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
}

.markdown-body .table-wrapper thead th {
  background-color: rgba(0, 0, 0, 0.06);
  font-weight: 600;
}

.markdown-body .table-wrapper tbody tr:last-child th,
.markdown-body .table-wrapper tbody tr:last-child td {
  border-bottom: none;
}

.markdown-body .table-wrapper tbody tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.06);
}

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
}

.markdown-body input[type="checkbox"] { margin-right: 0.4em; }

.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}

.markdown-body pre {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  overflow-x: auto;
}

.markdown-body pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.markdown-body .hljs-keyword,
.markdown-body .hljs-selector-tag,
.markdown-body .hljs-literal,
.markdown-body .hljs-section,
.markdown-body .hljs-link { color: #d73a49; }

.markdown-body .hljs-string,
.markdown-body .hljs-title,
.markdown-body .hljs-name,
.markdown-body .hljs-type,
.markdown-body .hljs-attribute,
.markdown-body .hljs-symbol,
.markdown-body .hljs-bullet,
.markdown-body .hljs-addition,
.markdown-body .hljs-variable,
.markdown-body .hljs-template-tag,
.markdown-body .hljs-template-variable { color: #032f62; }

.markdown-body .hljs-comment,
.markdown-body .hljs-quote,
.markdown-body .hljs-deletion,
.markdown-body .hljs-meta { color: #6a737d; }

.markdown-body .hljs-number,
.markdown-body .hljs-regexp,
.markdown-body .hljs-built_in,
.markdown-body .hljs-builtin-name { color: #005cc5; }

.markdown-body .hljs-emphasis { font-style: italic; }
.markdown-body .hljs-strong { font-weight: 700; }

@media (prefers-color-scheme: dark) {
  :root { color: #f6f8fa; background: #2f2f2f; }
  .markdown-body a { color: #58a6ff; }
  .markdown-body blockquote { color: #8b949e; border-left-color: #444c56; }
  .markdown-body th,
  .markdown-body td { border-color: #444c56; }
  .markdown-body code { background: rgba(255, 255, 255, 0.12); }
  .markdown-body pre { background: rgba(255, 255, 255, 0.08); }
  .markdown-body .hljs-keyword,
  .markdown-body .hljs-selector-tag,
  .markdown-body .hljs-literal,
  .markdown-body .hljs-section,
  .markdown-body .hljs-link { color: #ff7b72; }
  .markdown-body .hljs-string,
  .markdown-body .hljs-title,
  .markdown-body .hljs-name,
  .markdown-body .hljs-type,
  .markdown-body .hljs-attribute,
  .markdown-body .hljs-symbol,
  .markdown-body .hljs-bullet,
  .markdown-body .hljs-addition,
  .markdown-body .hljs-variable,
  .markdown-body .hljs-template-tag,
  .markdown-body .hljs-template-variable { color: #a5d6ff; }
  .markdown-body .hljs-comment,
  .markdown-body .hljs-quote,
  .markdown-body .hljs-deletion,
  .markdown-body .hljs-meta { color: #8b949e; }
  .markdown-body .hljs-number,
  .markdown-body .hljs-regexp,
  .markdown-body .hljs-built_in,
  .markdown-body .hljs-builtin-name { color: #79c0ff; }
}
`;

function normalizeInput(input: ExportHtmlInput): ExportHtmlOptions {
  if (typeof input === "string") return { fileName: input };
  return input ?? {};
}

function fileNameOnly(fileName: string): string {
  const normalized = fileName.replace(/\\/g, "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1) || DEFAULT_TITLE;
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };

  return value.replace(
    /&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi,
    (entity, reference: string) => {
      if (reference.startsWith("#x") || reference.startsWith("#X")) {
        const codePoint = Number.parseInt(reference.slice(2), 16);
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      if (reference.startsWith("#")) {
        const codePoint = Number.parseInt(reference.slice(1), 10);
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return named[reference.toLowerCase()] ?? entity;
    },
  );
}

function textFromHeadingHtml(headingHtml: string): string {
  return decodeHtmlEntities(headingHtml.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeadingTitle(fragment: string): string | undefined {
  const heading = fragment.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i);
  if (!heading) return undefined;
  const title = textFromHeadingHtml(heading[1]);
  return title || undefined;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveTitle(fragment: string, options: ExportHtmlOptions): string {
  const title = options.title?.trim();
  if (title) return title;
  return firstHeadingTitle(fragment) ??
    (options.fileName ? fileNameOnly(options.fileName) : DEFAULT_TITLE);
}

/**
 * Render Markdown as a complete, standalone HTML document.
 *
 * The fragment always comes from the shared sanitized renderer. Keeping this
 * function as a thin document wrapper makes the preview and exported body
 * use exactly the same Markdown/GFM/highlight/sanitize pipeline.
 */
export function renderMarkdown(source: string, input?: ExportHtmlInput): string {
  const options = normalizeInput(input);
  const fragment = renderMarkdownFragment(source);
  const title = escapeHtmlText(resolveTitle(fragment, options));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${INLINE_STYLES}</style>
</head>
<body>
  <main class="markdown-body">
${fragment}
  </main>
</body>
</html>
`;
}

/** Descriptive aliases for callers that do not want to shadow the preview API. */
export const renderHtml = renderMarkdown;
export const exportHtml = renderMarkdown;

function htmlFileName(fileName?: string): string {
  if (!fileName) return DEFAULT_FILE_NAME;
  const name = fileNameOnly(fileName);
  if (/\.html?$/i.test(name)) return name;
  if (/\.(?:md|markdown|txt)$/i.test(name)) {
    return name.replace(/\.[^.]+$/i, ".html");
  }
  return `${name}.html`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "{}" ? serialized : "匯出 HTML 失敗";
  } catch {
    return "匯出 HTML 失敗";
  }
}

/** Ask the native backend for an HTML destination. Null means cancellation. */
export function chooseHtmlExportPath(
  suggestedFileName = DEFAULT_FILE_NAME,
): Promise<string | null> {
  return invoke<string | null>("export_html_save_dialog", {
    suggestedFileName,
  });
}

/** Write an already-rendered HTML document through the native backend. */
export function saveTextFile(path: string, content: string): Promise<void> {
  return invoke("save_text_file", { path, content });
}

/**
 * Render and save HTML without owning any UI.
 *
 * The result is a discriminated union so a toolbar can distinguish a user
 * cancellation from a successful save and an actual dialog/write failure.
 */
export async function saveHtmlFile(
  source: string,
  input?: ExportHtmlInput,
): Promise<HtmlExportResult> {
  const options = normalizeInput(input);
  try {
    const content = renderMarkdown(source, options);
    const path = await chooseHtmlExportPath(htmlFileName(options.fileName));
    if (!path) return { status: "cancelled" };
    await saveTextFile(path, content);
    return { status: "saved", path };
  } catch (error) {
    return { status: "error", error: errorMessage(error) };
  }
}

export const saveExportHtml = saveHtmlFile;
