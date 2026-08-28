import { openUrl } from "@tauri-apps/plugin-opener";

export type PreviewLinkResult =
  | { kind: "opened"; url: string }
  | {
      kind: "ignored";
      reason: "not-link" | "internal-anchor" | "unsupported-protocol";
    };

export type OpenExternalUrl = (url: string) => void | Promise<void>;

export function isExternalLink(href: string): boolean {
  return /^(?:https?:\/\/|mailto:)/i.test(href.trim());
}

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (target instanceof HTMLAnchorElement) return target;
  if (target instanceof Element) return target.closest("a");
  return null;
}

export async function handlePreviewLinkClick(
  event: MouseEvent,
  openExternal: OpenExternalUrl = openUrl,
): Promise<PreviewLinkResult> {
  const anchor = findAnchor(event.target);
  if (!anchor) return { kind: "ignored", reason: "not-link" };

  const href = anchor.getAttribute("href")?.trim() ?? "";
  if (!href.startsWith("#") && !isExternalLink(href)) {
    return { kind: "ignored", reason: "unsupported-protocol" };
  }
  if (href.startsWith("#")) {
    return { kind: "ignored", reason: "internal-anchor" };
  }

  event.preventDefault();
  await openExternal(href);
  return { kind: "opened", url: href };
}

export function createPreviewLinkHandler(
  openExternal: OpenExternalUrl = openUrl,
): (event: MouseEvent) => Promise<PreviewLinkResult> {
  return (event) => handlePreviewLinkClick(event, openExternal);
}
