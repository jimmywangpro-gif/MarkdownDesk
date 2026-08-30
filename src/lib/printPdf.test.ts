// Vitest runs in Node, while the app's browser tsconfig intentionally omits
// the optional Node type declarations.
// @ts-expect-error node:fs is provided by the Vitest runtime.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { printPdf, type PrintMode } from "./printPdf";

const printCss = readFileSync("src/print.css", "utf8");

describe("printPdf", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the native print dialog", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const setMode = vi.fn<(mode: PrintMode) => void>();

    await printPdf({ mode: "view", setMode });

    expect(print).toHaveBeenCalledOnce();
    expect(setMode).not.toHaveBeenCalled();
  });

  it("shows the preview while printing from edit mode, then restores edit mode", async () => {
    const events: string[] = [];
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      events.push("print");
    });
    const setMode = vi.fn<(mode: PrintMode) => void>((mode) => {
      events.push(mode);
    });

    await printPdf({ mode: "edit", setMode });

    expect(print).toHaveBeenCalledOnce();
    expect(events).toEqual(["view", "print", "edit"]);
  });

  it("keeps print styling independent from the screen theme", () => {
    expect(printCss).toContain("@media print");
    expect(printCss).toMatch(/background(?:-color)?\s*:\s*#fff\s*!important/);
    expect(printCss).toMatch(/color\s*:\s*#000\s*!important/);
    expect(printCss).toContain(".toolbar");
    expect(printCss).toContain(".editor-input");
    expect(printCss).toContain(".preview-pane");
    expect(printCss).toMatch(/break-inside\s*:\s*avoid/);
    expect(printCss).toMatch(/page-break-inside\s*:\s*avoid/);
    expect(printCss).toContain("@page");
  });

  it("prints only the document surface, excluding title and toolbar chrome", () => {
    expect(printCss).toMatch(
      /\.title-bar\s*\{\s*display:\s*none\s*!important;/,
    );
    expect(printCss).toMatch(
      /\.toolbar\s*\{\s*display:\s*none\s*!important;/,
    );
    expect(printCss).toMatch(
      /\.preview-content\s*\{[\s\S]*?width:\s*100%\s*!important;/,
    );
  });
});
