const TASK_LINE_PATTERN = /^([ \t]*(?:[-+*]|\d{1,9}[.)])[ \t]+)\[([ xX])\](?=$|[ \t])/;

export function toggleTaskLine(source: string, lineNumber: number): string {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return source;

  const lines = source.split(/(\r\n|\r|\n)/);
  const lineIndex = (lineNumber - 1) * 2;
  if (lineIndex >= lines.length) return source;

  const line = lines[lineIndex];
  if (typeof line !== "string") return source;

  const match = TASK_LINE_PATTERN.exec(line);
  if (!match) return source;

  const nextState = match[2].toLowerCase() === "x" ? " " : "x";
  lines[lineIndex] = `${match[1]}[${nextState}]${line.slice(match[0].length)}`;
  return lines.join("");
}
