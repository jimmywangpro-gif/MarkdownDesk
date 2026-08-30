import { describe, it, expect } from "vitest";
import { renderMarkdown, renderMarkdownBlocks } from "./renderMarkdown";

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

// T02 GFM golden tests（unified 管線完整輸出鎖定）。
describe("renderMarkdown (T02 GFM golden)", () => {
  it("renders ATX headings h1-h6", () => {
    expect(renderMarkdown("# H1\n\n### H3\n\n###### H6")).toBe(
      "<h1>H1</h1>\n<h3>H3</h3>\n<h6>H6</h6>"
    );
  });

  it("renders nested unordered and ordered lists", () => {
    expect(
      renderMarkdown(
        "- item 1\n  - sub a\n    - sub sub i\n  - sub b\n- item 2\n\n1. first\n2. second"
      )
    ).toBe(
      `<ul>
<li>item 1
<ul>
<li>sub a
<ul>
<li>sub sub i</li>
</ul>
</li>
<li>sub b</li>
</ul>
</li>
<li>item 2</li>
</ul>
<ol>
<li>first</li>
<li>second</li>
</ol>`
    );
  });

  it("renders GFM tables with alignment", () => {
    expect(renderMarkdown("| a | b | c |\n| :- | -: | :-: |\n| 1 | 2 | 3 |")).toBe(
      `<div class="table-wrapper"><table>
<thead>
<tr>
<th class="align-left">a</th>
<th class="align-right">b</th>
<th class="align-center">c</th>
</tr>
</thead>
<tbody>
<tr>
<td class="align-left">1</td>
<td class="align-right">2</td>
<td class="align-center">3</td>
</tr>
</tbody>
</table></div>`
    );
  });

  it("renders GFM task lists with checkbox state", () => {
    expect(renderMarkdown("- [x] done\n- [ ] todo")).toBe(
      `<ul class="contains-task-list">
<li class="task-list-item"><input type="checkbox" checked disabled> done</li>
<li class="task-list-item"><input type="checkbox" disabled> todo</li>
</ul>`
    );
  });

  it("renders GFM strikethrough", () => {
    expect(renderMarkdown("~~gone~~ and ~~more~~")).toBe(
      "<p><del>gone</del> and <del>more</del></p>"
    );
  });

  it("renders GFM autolinks (URL and email)", () => {
    expect(renderMarkdown("<https://example.com> and <user@example.com>")).toBe(
      '<p><a href="https://example.com">https://example.com</a> and <a href="mailto:user@example.com">user@example.com</a></p>'
    );
  });

  it("renders blockquotes", () => {
    expect(renderMarkdown("> quote line 1\n> quote line 2")).toBe(
      `<blockquote>
<p>quote line 1
quote line 2</p>
</blockquote>`
    );
  });

  it("highlights fenced code blocks with hljs classes", () => {
    expect(
      renderMarkdown("```js\nconst x = 1;\nif (x) { console.log(x); }\n```")
    ).toBe(
      `<pre><code class="hljs language-js"><span class="hljs-keyword">const</span> x = <span class="hljs-number">1</span>;
<span class="hljs-keyword">if</span> (x) { <span class="hljs-variable language_">console</span>.<span class="hljs-title function_">log</span>(x); }
</code></pre>`
    );
  });

  it("leaves unlabeled code blocks unhighlighted", () => {
    expect(renderMarkdown("```\nno language\n```")).toBe(
      "<pre><code>no language\n</code></pre>"
    );
  });

  it("renders inline emphasis and code", () => {
    expect(renderMarkdown("this is **bold** and *italic* and `code`")).toBe(
      "<p>this is <strong>bold</strong> and <em>italic</em> and <code>code</code></p>"
    );
  });
});

// T02 sanitize golden tests（rehype-sanitize 剝除案例）。
describe("renderMarkdown (T02 sanitize)", () => {
  it("strips raw script tags entirely", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).toBe("");
  });

  it("strips raw HTML with event handlers entirely", () => {
    expect(renderMarkdown('<img src="x" onerror="alert(1)">')).toBe("");
  });

  it("strips javascript: URIs from links", () => {
    expect(renderMarkdown("[click](javascript:alert(1))")).toBe(
      "<p><a>click</a></p>"
    );
  });

  it("keeps safe https links", () => {
    expect(renderMarkdown("[ok](https://example.com)")).toBe(
      '<p><a href="https://example.com">ok</a></p>'
    );
  });
});

// Task renderer contract: metadata and control identifiers are derived from
// the parsed source position, while the existing sanitize guarantees remain.
describe("renderMarkdownBlocks task metadata contract", () => {
  it("maps top-level and nested tasks to source lines and checked state", () => {
    const result = renderMarkdownBlocks(
      "intro\n\n- [ ] top todo\n  - [x] nested done\n  - [ ] nested todo\n- [x] second top",
    );

    expect(result.tasks).toEqual([
      { line: 3, checked: false },
      { line: 4, checked: true },
      { line: 5, checked: false },
      { line: 6, checked: true },
    ]);
    expect(result.html).toContain(
      '<input type="checkbox" data-task-line="3" aria-label="Toggle task on line 3">',
    );
    expect(result.html).toContain(
      '<input type="checkbox" data-task-line="4" aria-label="Toggle task on line 4" checked>',
    );
    expect(result.html).toContain(
      '<input type="checkbox" data-task-line="6" aria-label="Toggle task on line 6" checked>',
    );
    expect(result.html).not.toContain("disabled");
    expect(result.html.match(/data-task-line="/g)).toHaveLength(4);
  });

  it("emits focusable labelled controls without copying task text into attributes", () => {
    const result = renderMarkdownBlocks(
      '- [ ] <img src="x" onerror="alert(1)"> & "quoted"',
    );
    const container = document.createElement("div");
    container.innerHTML = result.html;

    const checkbox = container.querySelector<HTMLInputElement>(
      'input[data-task-line="1"]',
    );
    expect(checkbox).not.toBeNull();
    expect(checkbox?.disabled).toBe(false);
    expect(checkbox?.getAttribute("aria-label")).toBe("Toggle task on line 1");
    expect(result.html).not.toContain("<img");
    expect(result.html).not.toContain("onerror=");
    expect(result.html).not.toContain('aria-label="<');
  });

  it("keeps task identifiers generated and sanitizer-safe", () => {
    const result = renderMarkdownBlocks(
      '- [ ] <img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))',
    );

    expect(result.tasks).toEqual([{ line: 1, checked: false }]);
    expect(result.html).not.toMatch(/<script\b/i);
    expect(result.html).not.toContain("onerror=");
    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toMatch(/data-task-line="[^0-9]/);
  });
});
