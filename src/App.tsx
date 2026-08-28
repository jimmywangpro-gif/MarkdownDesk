import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdownBlocks } from "./lib/renderMarkdown";
import { useSettings } from "./lib/SettingsContext";
import {
  onFileChanged,
  openFile,
  readFile,
  recentFilesAdd,
  recentFilesClear,
  recentFilesList,
  saveFile,
  saveFileAs,
  unwatchFile,
  watchFile,
  type RecentFile,
  type UnlistenFn,
} from "./lib/fileOps";
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
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileMtime, setFileMtime] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const filePathRef = useRef<string | null>(null);
  const fileMtimeRef = useRef<number | null>(null);

  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);

  useEffect(() => {
    fileMtimeRef.current = fileMtime;
  }, [fileMtime]);

  const refreshRecent = useCallback(() => {
    recentFilesList()
      .then((files) => {
        if (Array.isArray(files)) setRecentFiles(files);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  const applyFile = useCallback(
    (file: { path: string; content: string; mtime: number }) => {
      setSource(file.content);
      setFilePath(file.path);
      setFileMtime(file.mtime);
      setDirty(false);
    },
    [],
  );

  const handleOpen = useCallback(async () => {
    if (dirty && !window.confirm("目前有未儲存的變更，確定要開啟其他檔案嗎？")) {
      return;
    }
    const file = await openFile();
    if (!file) return;
    applyFile(file);
    await recentFilesAdd(file.path);
    await watchFile(file.path);
    refreshRecent();
  }, [dirty, applyFile, refreshRecent]);

  const handleSaveAs = useCallback(async () => {
    const saved = await saveFileAs(source);
    if (!saved) return;
    setFilePath(saved.path);
    setFileMtime(saved.mtime);
    setDirty(false);
    await recentFilesAdd(saved.path);
    await watchFile(saved.path);
    refreshRecent();
  }, [source, refreshRecent]);

  const handleSave = useCallback(async () => {
    if (filePath) {
      const saved = await saveFile(filePath, source);
      setFileMtime(saved.mtime);
      setDirty(false);
      await recentFilesAdd(filePath);
    } else {
      await handleSaveAs();
    }
  }, [filePath, source, handleSaveAs]);

  const handleLoadRecent = useCallback(
    async (path: string) => {
      if (dirty && !window.confirm("目前有未儲存的變更，確定要開啟其他檔案嗎？")) {
        return;
      }
      const file = await readFile(path);
      applyFile(file);
      await watchFile(file.path);
    },
    [dirty, applyFile],
  );

  const handleClearRecent = useCallback(async () => {
    await recentFilesClear();
    setRecentFiles([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    onFileChanged((path) => {
      if (path !== filePathRef.current) return;
      readFile(path)
        .then((file) => {
          if (file.mtime === fileMtimeRef.current) return;
          if (window.confirm("檔案已在外部被修改，是否重新載入？")) {
            applyFile(file);
          }
        })
        .catch(() => {});
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [applyFile]);

  useEffect(() => {
    return () => {
      if (filePathRef.current) void unwatchFile(filePathRef.current);
    };
  }, []);

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
        <button
          type="button"
          onClick={() => void handleOpen()}
          data-testid="open-button"
        >
          開啟
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          data-testid="save-button"
        >
          儲存
        </button>
        <button
          type="button"
          onClick={() => void handleSaveAs()}
          data-testid="save-as-button"
        >
          另存
        </button>
        <select
          aria-label="最近檔案"
          data-testid="recent-select"
          value=""
          onChange={(e) => {
            const path = e.currentTarget.value;
            if (path) void handleLoadRecent(path);
          }}
        >
          <option value="">最近檔案…</option>
          {recentFiles.map((file) => (
            <option key={file.path} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleClearRecent()}
          data-testid="clear-recent-button"
        >
          清除最近
        </button>
        <span className="file-status" data-testid="file-status">
          {filePath ? filePath : "未命名"}
          {dirty ? " •" : ""}
        </span>
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
              onChange={(e) => {
                setSource(e.currentTarget.value);
                setDirty(true);
              }}
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
