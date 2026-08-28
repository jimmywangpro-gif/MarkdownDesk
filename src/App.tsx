import { useState } from "react";
import { renderMarkdown } from "./lib/renderMarkdown";
import "./App.css";

const INITIAL_SOURCE = "# MarkdownDesk\n\nStart typing…";

function App() {
  const [source, setSource] = useState(INITIAL_SOURCE);

  return (
    <main className="app">
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
