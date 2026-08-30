// Full Markdown renderer (T02) built on the unified ecosystem.
//
// Pipeline: remark-parse → remark-gfm → remark-rehype → rehype-highlight
//           → rehype-sanitize → custom hast stringifier.
//
// - remark-gfm adds tables, task lists, strikethrough, and autolinks.
// - rehype-highlight adds hljs token classes to fenced code blocks.
// - rehype-sanitize (GitHub default schema, extended to allow highlight
//   classes on <code>/<span>) strips raw HTML, event-handler attributes,
//   and javascript: URIs.
// - The hast tree is serialized by a small local stringifier (no
//   rehype-stringify dependency), mapping hast property names (className)
//   to HTML attribute names (class).
//
// Pure function, no side effects, signature unchanged:
//   renderMarkdown(source: string): string

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";

// ---------------------------------------------------------------------------
// Sanitize schema: GitHub default + highlight classes.
// The default schema already allows every GFM element (table, thead, tbody,
// tr, th, td, del, input, ul/li task-list classes, …) and strips raw HTML,
// event attributes, and non-http(s)/mailto protocols. It does *not* allow
// className on <span> (rehype-highlight token wrappers) or the `hljs` class
// on <code>, so we extend those two explicitly.
// ---------------------------------------------------------------------------
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: ["className"],
    span: ["className"],
  },
};

// ---------------------------------------------------------------------------
// hast → HTML stringifier.
// ---------------------------------------------------------------------------

// hast property names → HTML attribute names (only the ones that can appear
// in sanitized GFM output, plus a few common ones for safety).
const ATTR_NAMES: Record<string, string> = {
  className: "class",
  htmlFor: "for",
  tabIndex: "tabindex",
  readOnly: "readonly",
  colSpan: "colspan",
  rowSpan: "rowspan",
  charSet: "charset",
  httpEquiv: "http-equiv",
  acceptCharset: "accept-charset",
  srcSet: "srcset",
  noHref: "nohref",
  noShade: "noshade",
  noWrap: "nowrap",
  isMap: "ismap",
  useMap: "usemap",
  vAlign: "valign",
  hSpace: "hspace",
  cellPadding: "cellpadding",
  cellSpacing: "cellspacing",
  frameBorder: "frameborder",
  itemProp: "itemprop",
  dateTime: "datetime",
  hrefLang: "hreflang",
  maxLength: "maxlength",
};

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: {
    start?: { line?: number };
    end?: { line?: number };
  };
}

// GFM align attribute value → styleable class name (T12 table polish).
const ALIGN_CLASSES: Record<string, string> = {
  left: "align-left",
  right: "align-right",
  center: "align-center",
};

function wrapTable(node: HastNode): HastNode {
  if (node.type === "element" && node.tagName === "table") {
    return {
      type: "element",
      tagName: "div",
      properties: { className: ["table-wrapper"] },
      children: [node],
    };
  }
  return node;
}

function applyAlignmentClasses(node: HastNode): void {
  if (
    node.type === "element" &&
    (node.tagName === "th" || node.tagName === "td")
  ) {
    const align = node.properties?.align;
    if (typeof align === "string" && ALIGN_CLASSES[align]) {
      const rest = { ...(node.properties ?? {}) };
      delete rest.align;
      node.properties = {
        ...rest,
        className: [
          ...((rest.className as string[] | undefined) ?? []),
          ALIGN_CLASSES[align],
        ],
      };
    }
  }
  for (const child of node.children ?? []) applyAlignmentClasses(child);
}

export interface MarkdownTask {
  line: number;
  checked: boolean;
}

function annotateTasks(node: HastNode, tasks: MarkdownTask[]): void {
  if (node.type === "element" && node.tagName === "li") {
    const className = node.properties?.className;
    const isTaskItem = Array.isArray(className)
      ? className.includes("task-list-item")
      : className === "task-list-item";
    const input = (node.children ?? []).find(
      (child) => child.type === "element" && child.tagName === "input",
    );
    const line = node.position?.start?.line;

    if (
      isTaskItem &&
      input &&
      typeof line === "number" &&
      Number.isInteger(line) &&
      line > 0
    ) {
      const inputProperties = input.properties ?? {};
      const { type, ...rest } = inputProperties;
      input.properties = {
        ...(type === undefined ? {} : { type }),
        "data-task-line": String(line),
        "aria-label": `Toggle task on line ${line}`,
        ...Object.fromEntries(
          Object.entries(rest).filter(([key]) => key !== "disabled"),
        ),
      };
      tasks.push({ line, checked: inputProperties.checked === true });
    }
  }

  for (const child of node.children ?? []) annotateTasks(child, tasks);
}

function stringifyHast(node: HastNode): string {
  if (node.type === "root") {
    return (node.children ?? []).map(stringifyHast).join("");
  }
  if (node.type === "text") {
    return escapeText(node.value ?? "");
  }
  if (node.type === "element" && node.tagName) {
    const attrs = Object.entries(node.properties ?? {})
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([key, v]) => {
        const name = ATTR_NAMES[key] ?? key;
        if (v === true) return ` ${name}`;
        const value = Array.isArray(v) ? v.join(" ") : String(v);
        return ` ${name}="${escapeAttr(value)}"`;
      })
      .join("");
    const inner = (node.children ?? []).map(stringifyHast).join("");
    if (VOID_ELEMENTS.has(node.tagName)) {
      return `<${node.tagName}${attrs}>`;
    }
    return `<${node.tagName}${attrs}>${inner}</${node.tagName}>`;
  }
  // comment/doctype/raw nodes never survive sanitize; drop them.
  return "";
}

// ---------------------------------------------------------------------------
// Processor (built once at module load; deterministic, no side effects).
// ---------------------------------------------------------------------------
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeHighlight)
  .use(rehypeSanitize, schema);

export function renderMarkdown(source: string): string {
  const tree = processor.parse(source);
  const result = processor.runSync(tree);
  applyAlignmentClasses(result);
  const polished = {
    ...result,
    children: (result.children ?? []).map(wrapTable),
  };
  return stringifyHast(polished);
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// T03: block-anchored rendering for split-view sync scroll.
//
// renderMarkdownBlocks(source) returns the same sanitized HTML as
// renderMarkdown(source), plus:
//   - a `data-block-index` attribute on every top-level block element, and
//   - a `blocks` array mapping each block index to the 1-based source line
//     where the block starts.
//   - a `data-task-line` attribute on every rendered task checkbox, and
//   - a `tasks` array mapping each task checkbox to its source line and state.
//
// The editor caret line can then be mapped to a block via the largest
// startLine <= caretLine, and the preview scrolled to that block's element.
// The existing renderMarkdown pipeline is untouched; this helper reuses the
// same processor and only annotates the hast tree before stringifying.
// ---------------------------------------------------------------------------

export interface MarkdownBlock {
  index: number;
  startLine: number;
}

export interface MarkdownBlocksResult {
  html: string;
  blocks: MarkdownBlock[];
  tasks: MarkdownTask[];
}

export function renderMarkdownBlocks(source: string): MarkdownBlocksResult {
  const tree = processor.parse(source);
  const result = processor.runSync(tree);

  applyAlignmentClasses(result);

  const blocks: MarkdownBlock[] = [];
  const tasks: MarkdownTask[] = [];
  annotateTasks(result, tasks);
  const children = result.children ?? [];
  let line = 1;
  let blockIndex = 0;

  children.forEach((child) => {
    if (child.type !== "element") return;
    // Source positions survive the pipeline (remark → rehype → sanitize),
    // giving exact 1-based start/end lines for each top-level block.
    const startLine = child.position?.start?.line ?? line;
    // Injected after sanitize, so the attribute survives rehype-sanitize.
    child.properties = {
      ...(child.properties ?? {}),
      "data-block-index": String(blockIndex),
    };
    blocks.push({ index: blockIndex, startLine });
    blockIndex += 1;
    line = (child.position?.end?.line ?? startLine) + 1;
  });

  // Wrap tables AFTER block indexing so block indices keep mapping to the
  // same elements the sync-scroll logic queries.
  const polished = {
    ...result,
    children: children.map(wrapTable),
  };

  return { html: stringifyHast(polished), blocks, tasks };
}
