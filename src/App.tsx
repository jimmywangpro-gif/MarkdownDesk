import { useState } from "react";
import { renderMarkdown } from "./lib/renderMarkdown";
import { useSettings } from "./lib/SettingsContext";
import "./App.css";

const INITIAL_SOURCE = "# MarkdownDesk\n\nStart typing…";

function App() {
  const [source, setSource] = useState(INITIAL_SOURCE);
  const { settings, setTheme, setEditorFontSize, setPreviewFontSize } = useSettings();

  return (
    <main className="app">
      <header className="toolbar" data-testid="toolbar">
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
      <section className="pane editor-pane" data-testid="editor-pane">
        <textarea
          className="editor-input"
          data-testid="editor-input"
          value={source}
          onChange={(e) => setSource(e.currentTarget.value)}
          spellCheck={false}
        />
      </section>
      <section className="pane preview-pane" data-testid="preview-pane">
        <div
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
        />
      </section>
    </main>
  );
}

export default App;
