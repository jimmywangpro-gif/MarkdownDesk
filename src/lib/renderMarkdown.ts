// Minimal Markdown renderer (T01 tracer bullet).
// Block level: ATX headings (# .. ######) and paragraphs.
// Inline level: **bold**, *italic*, `code`, and line breaks within paragraphs.
// Security baseline: raw HTML is entity-escaped before any markup is emitted,
// so tags, attributes, and javascript: links can never pass through.

const ESCAPE_CHARS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "=": "&#61;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"=]/g, (ch) => ESCAPE_CHARS[ch]);
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

export function renderMarkdown(source: string): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
      paragraph = [];
    }
  };

  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();

  return blocks.join("\n");
}
