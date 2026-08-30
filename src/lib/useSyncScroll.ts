import { useEffect, type RefObject } from "react";
import type { MarkdownBlock } from "./renderMarkdown";

// T03: block-anchored editor → preview scroll sync.
//
// While enabled (split mode), the editor's public cursor-offset callback maps
// the caret's 1-based line to the nearest block whose startLine <= caretLine,
// then scrolls the preview so that block's element sits at the top of the
// preview pane. Block-level anchoring (not pixel-level) keeps the mapping
// stable while typing.
export function useSyncScroll(
  previewRef: RefObject<HTMLElement | null>,
  blocks: MarkdownBlock[],
  source: string,
  cursorOffset: number,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    const preview = previewRef.current;
    if (!preview) return;

    const boundedOffset = Math.max(0, Math.min(cursorOffset, source.length));
    const caretLine = source.slice(0, boundedOffset).split("\n").length;
    let target: MarkdownBlock | undefined;
    for (const block of blocks) {
      if (block.startLine <= caretLine) target = block;
      else break;
    }
    if (!target) return;
    const el = preview.querySelector(`[data-block-index="${target.index}"]`);
    if (el instanceof HTMLElement) {
      preview.scrollTop = el.offsetTop;
    }
  }, [previewRef, blocks, source, cursorOffset, enabled]);
}
