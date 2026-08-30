import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (offset: number) => void;
}

const contentAttributes = EditorView.contentAttributes.of({
  "aria-label": "Markdown editor",
  "aria-multiline": "true",
  class: "editor-input",
  "data-testid": "editor-input",
  role: "textbox",
  spellcheck: "false",
});

export function MarkdownEditor({ value, onChange, onCursorChange }: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const syncingFromPropsRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);

  onChangeRef.current = onChange;
  onCursorChangeRef.current = onCursorChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      doc: value,
      parent: host,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.editable.of(true),
        contentAttributes,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingFromPropsRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.docChanged || update.selectionSet) {
            onCursorChangeRef.current?.(update.state.selection.main.head);
          }
        }),
      ],
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;

    syncingFromPropsRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
    syncingFromPropsRef.current = false;
  }, [value]);

  return <div ref={hostRef} className="editor-host" />;
}
