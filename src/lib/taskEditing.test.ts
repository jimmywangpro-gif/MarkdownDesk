import { describe, expect, it } from "vitest";
import { toggleTaskLine } from "./taskEditing";

describe("toggleTaskLine", () => {
  it.each([
    ["- [ ] unchecked", "- [x] unchecked"],
    ["* [x] lowercase checked", "* [ ] lowercase checked"],
    ["+ [X] uppercase checked", "+ [ ] uppercase checked"],
    ["  \t7. [ ] ordered", "  \t7. [x] ordered"],
    ["\t8) [x] ordered paren", "\t8) [ ] ordered paren"],
  ])("toggles a valid task marker without changing its line text", (line, expected) => {
    expect(toggleTaskLine(`before\r\n${line}\r\nafter`, 2)).toBe(
      `before\r\n${expected}\r\nafter`,
    );
  });

  it("toggles only the requested nested task line", () => {
    const source = "- [ ] parent\n  - [x] child\n    + [ ] grandchild\n";
    expect(toggleTaskLine(source, 2)).toBe(
      "- [ ] parent\n  - [ ] child\n    + [ ] grandchild\n",
    );
  });

  it.each([
    0,
    1.5,
    5,
    -1,
  ])("leaves the source unchanged for an invalid line number (%s)", (line) => {
    const source = "- [ ] todo\n";
    expect(toggleTaskLine(source, line)).toBe(source);
  });

  it.each([
    "plain text",
    "- [y] not a task",
    "-[] missing whitespace",
    "1 [ ] missing ordered marker",
    "1234567890. [ ] too many ordered digits",
    "- [ ]task without separating whitespace",
  ])("leaves a non-task line unchanged: %s", (line) => {
    expect(toggleTaskLine(`${line}\nother`, 1)).toBe(`${line}\nother`);
  });

  it("preserves LF, CRLF, and CR line endings", () => {
    expect(toggleTaskLine("- [ ] one\n- [ ] two", 2)).toBe(
      "- [ ] one\n- [x] two",
    );
    expect(toggleTaskLine("- [ ] one\r\n- [ ] two", 2)).toBe(
      "- [ ] one\r\n- [x] two",
    );
    expect(toggleTaskLine("- [ ] one\r- [ ] two", 2)).toBe(
      "- [ ] one\r- [x] two",
    );
  });
});
