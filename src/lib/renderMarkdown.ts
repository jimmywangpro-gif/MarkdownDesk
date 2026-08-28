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
  return stringifyHast(result);
}
