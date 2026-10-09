"use client";

import { useEffect, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

if (typeof window !== "undefined") {
  self.MonacoEnvironment = {
    getWorker: () =>
      new Worker(new URL("monaco-editor/editor/editor.worker", import.meta.url), { type: "module" }),
  };
  loader.config({ monaco });
}

function defineThemes() {
  const css = getComputedStyle(document.documentElement);
  const get = (v) => css.getPropertyValue(v).trim() || undefined;
  const common = (base) => ({
    base,
    inherit: true,
    rules: [],
    colors: {
      "editor.background": get("--bg"),
      "editorCursor.foreground": get("--primary"),
      "editor.lineHighlightBackground": get("--surface"),
      "editorLineNumber.foreground": get("--muted"),
    },
  });
  monaco.editor.defineTheme("exam-light", common("vs"));
  monaco.editor.defineTheme("exam-dark", common("vs-dark"));
}

export default function SqlEditor({
  value, onChange, onExecute, onSave, errorLine, errorMessage, ariaLabel, lines = 8,
}) {
  const cb = useRef({});
  cb.current = { onExecute, onSave, onChange };
  const editorRef = useRef(null);

  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!model) return;
    if (!errorLine) return monaco.editor.setModelMarkers(model, "mysql", []);
    const ln = Math.min(errorLine, model.getLineCount());
    monaco.editor.setModelMarkers(model, "mysql", [
      {
        severity: monaco.MarkerSeverity.Error,
        message: errorMessage ?? "SQL error",
        startLineNumber: ln, endLineNumber: ln,
        startColumn: model.getLineFirstNonWhitespaceColumn(ln) || 1,
        endColumn: model.getLineMaxColumn(ln),
      },
    ]);
  }, [errorLine, errorMessage, value]);

  const mount = (ed) => {
    editorRef.current = ed;
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => cb.current.onExecute?.());
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => cb.current.onSave?.());
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => monaco.editor.setTheme(dark.matches ? "exam-dark" : "exam-light");
    defineThemes();
    apply();
    dark.addEventListener("change", apply);
  };

  const lineHeight = 22;
  return (
    <div
      className="overflow-hidden rounded-lg border border-line focus-within:border-primary"
      style={{ height: Math.max(lines, 8) * lineHeight + 16 }}
    >
      <Editor
        language="mysql"
        theme="exam-light"
        value={value}
        onChange={(v) => cb.current.onChange?.(v ?? "")}
        onMount={mount}
        loading={<div className="p-4 text-sm text-muted">กำลังโหลด editor…</div>}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          ariaLabel: ariaLabel ?? "SQL editor",
          tabSize: 2,
          fixedOverflowWidgets: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: "off",
          acceptSuggestionOnEnter: "off",
          tabCompletion: "off",
          parameterHints: { enabled: false },
        }}
      />
    </div>
  );
}
