import { useCallback, useRef, useState } from "react";

// T13: editor/preview split ratio. Default 1:2 (editor gets 1/3). Drag the
// divider or use Arrow keys (5% steps) to resize. Clamped to [15%, 85%].

export const SPLIT_MIN = 15;
export const SPLIT_MAX = 85;
export const SPLIT_DEFAULT = 33.3333; // 1:2 default, as a percentage
export const KEYBOARD_STEP = 5;

export function clampRatio(ratio: number): number {
  return Math.round(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, ratio)) * 10000) / 10000;
}

export function useSplitRatio() {
  const [ratio, setRatio] = useState(SPLIT_DEFAULT);
  const draggingRef = useRef(false);

  const onDividerMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    draggingRef.current = true;
  }, []);

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!draggingRef.current) return;
    const workspace = document.querySelector<HTMLElement>(".workspace");
    if (!workspace) return;
    const rect = workspace.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((event.clientX - rect.left) / rect.width) * 100;
    setRatio(clampRatio(pct));
  }, []);

  const onMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const onDividerKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setRatio((r) => clampRatio(r - KEYBOARD_STEP));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setRatio((r) => clampRatio(r + KEYBOARD_STEP));
    }
  }, []);

  return {
    ratio,
    setRatio,
    dividerProps: {
      role: "separator",
      "aria-orientation": "vertical" as const,
      tabIndex: 0,
      onMouseDown: onDividerMouseDown,
      onKeyDown: onDividerKeyDown,
    },
    // Window-level listeners are attached by the App while dragging.
    isDragging: () => draggingRef.current,
    onMouseMove,
    onMouseUp,
  };
}