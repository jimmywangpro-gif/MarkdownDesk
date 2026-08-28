import { beforeEach, describe, expect, it, vi } from "vitest";
import { openUrl } from "@tauri-apps/plugin-opener";
import { handlePreviewLinkClick } from "./previewLinks";

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.mocked(openUrl).mockClear();
  document.body.replaceChildren();
});

describe("preview external-link seam", () => {
  it("opens http links with the system opener and prevents webview navigation", async () => {
    const anchor = document.createElement("a");
    anchor.href = "https://example.com/docs";
    document.body.append(anchor);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: anchor });

    const result = await handlePreviewLinkClick(event);

    expect(result).toEqual({ kind: "opened", url: "https://example.com/docs" });
    expect(openUrl).toHaveBeenCalledWith("https://example.com/docs");
    expect(event.defaultPrevented).toBe(true);
  });

  it("opens mailto links with the system opener", async () => {
    const anchor = document.createElement("a");
    anchor.href = "mailto:writer@example.com";
    document.body.append(anchor);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: anchor });

    await handlePreviewLinkClick(event);

    expect(openUrl).toHaveBeenCalledWith("mailto:writer@example.com");
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not intercept document-internal anchors", async () => {
    const anchor = document.createElement("a");
    anchor.href = "#section-2";
    document.body.append(anchor);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: anchor });

    const result = await handlePreviewLinkClick(event);

    expect(result).toMatchObject({ kind: "ignored", reason: "internal-anchor" });
    expect(openUrl).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
