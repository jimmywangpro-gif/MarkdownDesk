export type PrintMode = "edit" | "view" | "split";

export interface PrintPdfOptions {
  /** The mode currently rendered by the editor. */
  mode: PrintMode;
  /** Updates the editor mode while the native print dialog is prepared. */
  setMode: (mode: PrintMode) => void;
}

function waitForPreviewPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
    } else {
      window.setTimeout(resolve, 0);
    }
  });
}

/**
 * Print the rendered preview using the webview's native print dialog.
 *
 * In edit-only mode React has not rendered a preview pane, so wait for the
 * temporary view-mode update to paint before opening the dialog. The original
 * mode is restored after the dialog closes (or if printing throws).
 */
export async function printPdf({ mode, setMode }: PrintPdfOptions): Promise<void> {
  const needsPreview = mode === "edit";

  if (needsPreview) setMode("view");

  try {
    if (needsPreview) await waitForPreviewPaint();
    window.print();
  } finally {
    if (needsPreview) setMode(mode);
  }
}
