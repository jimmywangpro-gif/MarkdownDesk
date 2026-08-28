import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdownBlocks } from "./lib/renderMarkdown";
import { useSettings } from "./lib/SettingsContext";
import { useSyncScroll } from "./lib/useSyncScroll";
import "./App.css";

type Mode = "edit" | "view" | "split";

const INITIAL_SOURCE = "# MarkdownDesk\n\nStart typing…";
const RENDER_DEBOUNCE_MS = 150;

const MODE_LABELS: Record<Mode, string> = {
  edit: "Edit",
  view: "View",
  split: "Split",
};

// Leading-edge debounce: the first change applies immediately (keeps typing
// feel live), while changes within the debounce window are coalesced and
// applied after the window closes.
function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (value === debounced) return;
    if (!pendingRef.current) {
      pendingRef.current = true;
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => {
      pendingRef.current = false;
      setDebounced(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay, debounced]);

  return debounced;
}

function App() {
  const [source, setSource] = useState(INITIAL_SOURCE);
  const [mode, setMode] = useState<Mode>("split");
  const { settings, setTheme, setEditorFontSize, setPreviewFontSize } = useSettings();

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);

  const debouncedSource = useDebouncedValue(source, RENDER_DEBOUNCE_MS);
  const { html, blocks } = useMemo(
    () => renderMarkdownBlocks(debouncedSource),
    [debouncedSource],
  );

  useSyncScroll(editorRef, previewRef, blocks, mode === "split");

  // Mode shortcuts: Cmd/Ctrl+1/2/3 always; E/V/S only when not typing in the
  // editor (so plain letters keep working while editing).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "1") {
        e.preventDefault();
        setMode("edit");
        return;
      }
      if (mod && e.key === "2") {
        e.preventDefault();
        setMode("view");
        return;
      }
      if (mod && e.key === "3") {
        e.preventDefault();
        setMode("split");
        return;
      }
      if (mod || e.altKey || e.shiftKey) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === "e") setMode("edit");
      else if (key === "v") setMode("view");
      else if (key === "s") setMode("split");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showEditor = mode === "edit" || mode === "split";
  const showPreview = mode === "view" || mode === "split";

  return (
    <main className="app">
      <header className="toolbar" data-testid="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Mode</span>
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className="toolbar-button"
              data-testid={`mode-${m}`}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">Theme</span>
          <button
            type="button"
            className="toolbar-button"
            data-testid="theme-toggle"
            onClick={() => setTheme(settings.theme === "light" ? "dark" : "light")}
          >
            {settings.theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">Editor</span>
          <button
            type="button"
            className="toolbar-button"
            data-testid="editor-font-decrease"
            aria-label="Decrease editor font size"
            onClick={() => setEditorFontSize(Math.max(8, settings.editorFontSize - 1))}
          >
            −
          </button>
          <span className="toolbar-value" data-testid="editor-font-size">
            {settings.editorFontSize}px
          </span>
          <button
            type="button"
            className="toolbar-button"
            data-testid="editor-font-increase"
            aria-label="Increase editor font size"
            onClick={() => setEditorFontSize(Math.min(32, settings.editorFontSize + 1))}
          >
            +
          </button>
        </div>
        <div className="toolbar-group">
          <span className="toolbar-label">Preview</span>
          <button
            type="button"
            className="toolbar-button"
            data-testid="preview-font-decrease"
            aria-label="Decrease preview font size"
            onClick={() => setPreviewFontSize(Math.max(8, settings.previewFontSize - 1))}
          >
            −
          </button>
          <span className="toolbar-value" data-testid="preview-font-size">
            {settings.previewFontSize}px
          </span>
          <button
            type="button"
            className="toolbar-button"
            data-testid="preview-font-increase"
            aria-label="Increase preview font size"
            onClick={() => setPreviewFontSize(Math.min(32, settings.previewFontSize + 1))}
          >
            +
          </button>
        </div>
      </header>
      <div className="workspace">
        {showEditor && (
          <section className="pane editor-pane" data-testid="editor-pane">
            <textarea
              ref={editorRef}
              className="editor-input"
              data-testid="editor-input"
              value={source}
              onChange={(e) => setSource(e.currentTarget.value)}
              spellCheck={false}
            />
          </section>
        )}
        {showPreview && (
          <section className="pane preview-pane" data-testid="preview-pane" ref={previewRef}>
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
