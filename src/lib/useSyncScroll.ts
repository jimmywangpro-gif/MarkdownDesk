import { useEffect, useRef, type RefObject } from "react";
import type { MarkdownBlock } from "./renderMarkdown";

// T03: block-anchored editor → preview scroll sync.
//
// While enabled (split mode), any caret movement in the editor maps the
// caret's 1-based line to the nearest block whose startLine <= caretLine,
// then scrolls the preview so that block's element sits at the top of the
// preview pane. Block-level anchoring (not pixel-level) keeps the mapping
// stable while typing.
export function useSyncScroll(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  previewRef: RefObject<HTMLElement | null>,
  blocks: MarkdownBlock[],
  enabled: boolean,
): void {
  // Keep the latest block map in a ref so listeners never go stale.
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  useEffect(() => {
    if (!enabled) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const sync = () => {
      const caretLine = editor.value.slice(0, editor.selectionStart).split("\n").length;
      let target: MarkdownBlock | undefined;
      for (const block of blocksRef.current) {
        if (block.startLine <= caretLine) target = block;
        else break;
      }
      if (!target) return;
      const el = preview.querySelector(`[data-block-index="${target.index}"]`);
      if (el instanceof HTMLElement) {
        preview.scrollTop = el.offsetTop;
      }
    };

    editor.addEventListener("select", sync);
    editor.addEventListener("keyup", sync);
    editor.addEventListener("click", sync);
    return () => {
      editor.removeEventListener("select", sync);
      editor.removeEventListener("keyup", sync);
      editor.removeEventListener("click", sync);
    };
  }, [editorRef, previewRef, enabled]);
}
