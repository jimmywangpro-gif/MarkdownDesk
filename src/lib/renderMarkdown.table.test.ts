import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./renderMarkdown";

// T12 table display RED tests: GFM tables must come out with structured,
// styleable markup — a wrapper class, column alignment classes, and a
// caption hook — so CSS can render them as proper striped tables.
describe("renderMarkdown table structure (T12)", () => {
  it("wraps tables in a styled container class", () => {
    const html = renderMarkdown("| a | b |\n| :- | :- |\n| 1 | 2 |");
    expect(html).toContain('<div class="table-wrapper">');
    expect(html).toContain("</div>");
    expect(html.indexOf('<div class="table-wrapper">')).toBeLessThan(
      html.indexOf("<table>"),
    );
  });

  it("emits alignment classes on table cells instead of bare align attrs", () => {
    const html = renderMarkdown(
      "| a | b | c |\n| :- | -: | :-: |\n| 1 | 2 | 3 |",
    );
    expect(html).toContain('<th class="align-left">a</th>');
    expect(html).toContain('<th class="align-right">b</th>');
    expect(html).toContain('<th class="align-center">c</th>');
    expect(html).toContain('<td class="align-left">1</td>');
    expect(html).not.toContain('align="');
  });

  it("keeps table content intact through the wrapper", () => {
    const html = renderMarkdown("| k | v |\n| - | - |\n| x | y |");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("<td>x</td>");
    expect(html).toContain("<td>y</td>");
  });
});