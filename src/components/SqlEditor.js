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

const KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET", "DISTINCT", "AS",
  "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "ON", "AND", "OR", "NOT", "IN", "NOT IN", "EXISTS",
  "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL", "ASC", "DESC", "CASE", "WHEN", "THEN", "ELSE", "END",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "CONCAT", "IFNULL", "IF", "YEAR", "MONTH", "DAY", "DATEDIFF",
  "DATE_FORMAT", "LEFT", "RIGHT", "LOCATE", "TRUNCATE", "NOW", "CURDATE", "DIV", "UNION",
];

let schemaRef = { current: {} };
let providerRegistered = false;

function registerCompletion() {
  if (providerRegistered) return;
  providerRegistered = true;
  monaco.languages.registerCompletionItemProvider("mysql", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn,
      };
      const K = monaco.languages.CompletionItemKind;
      const tables = schemaRef.current;
      const suggestions = [
        ...KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range })),
        ...Object.keys(tables).map((t) => ({ label: t, kind: K.Class, insertText: t, detail: "table", range })),
        ...[...new Map(
          Object.entries(tables).flatMap(([t, cols]) => cols.map((c) => [c.name, `${t}.${c.type}`]))
        )].map(([name, detail]) => ({ label: name, kind: K.Field, insertText: name, detail, range })),
      ];
      return { suggestions };
    },
  });
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
  value, onChange, onExecute, onSave, schema, errorLine, errorMessage, ariaLabel, lines = 8,
}) {
  const cb = useRef({});
  cb.current = { onExecute, onSave, onChange };
  const editorRef = useRef(null);

  useEffect(() => {
    schemaRef.current = schema ?? {};
  }, [schema]);

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
    registerCompletion();
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
        }}
      />
    </div>
  );
}
