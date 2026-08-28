import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./renderMarkdown";

// T01 tracer-bullet golden tests（最小管線）。
// 完整 GFM golden 套件屬 T02；此處僅鎖定最小行為與安全基線。
describe("renderMarkdown (T01 minimal pipeline)", () => {
  it("renders heading level 1", () => {
    expect(renderMarkdown("# Hello")).toContain("<h1>Hello</h1>");
  });

  it("renders heading level 3", () => {
    expect(renderMarkdown("### Sub")).toContain("<h3>Sub</h3>");
  });

  it("renders paragraph text", () => {
    expect(renderMarkdown("plain text")).toContain("<p>plain text</p>");
  });

  it("renders bold text", () => {
    expect(renderMarkdown("this is **bold**")).toContain("<strong>bold</strong>");
  });

  it("escapes raw script tags (security baseline)", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
  });

  it("escapes inline event handlers (security baseline)", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror=");
  });
});