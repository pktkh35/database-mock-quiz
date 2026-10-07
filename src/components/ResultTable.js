"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCell } from "@/lib/client.js";

const SIZES = [10, 25, 50, 100];
const ROW_H = 32;
const FONT = '13px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const HEAD_FONT = '600 12px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const PAD = 12;

// Drawn on <canvas> on purpose: column names / cells cannot be selected or copied.
function CanvasGrid({ columns, cells }) {
  const ref = useRef(null);
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const bump = () => setTheme((t) => t + 1);
    mq.addEventListener("change", bump);
    document.fonts?.ready.then(bump);
    return () => mq.removeEventListener("change", bump);
  }, []);

  const layout = useMemo(() => {
    const c = document.createElement("canvas").getContext("2d");
    const widths = columns.map((name, i) => {
      c.font = HEAD_FONT;
      let w = c.measureText(name).width;
      c.font = FONT;
      for (const r of cells) w = Math.max(w, c.measureText(r[i] ?? "NULL").width);
      return Math.ceil(w) + PAD * 2;
    });
    return { widths, total: widths.reduce((a, b) => a + b, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, cells, theme]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const parentW = cv.parentElement.clientWidth;
    const w = Math.max(layout.total, parentW);
    const h = ROW_H * (cells.length + 1);
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const col = (v) => css.getPropertyValue(v).trim();
    g.fillStyle = col("--bg");
    g.fillRect(0, 0, w, h);
    g.fillStyle = col("--surface");
    g.fillRect(0, 0, w, ROW_H);
    g.textBaseline = "middle";
    g.strokeStyle = col("--line");
    g.lineWidth = 1;
    let x = 0;
    columns.forEach((name, i) => {
      g.font = HEAD_FONT;
      g.fillStyle = col("--muted");
      g.fillText(name, x + PAD, ROW_H / 2);
      cells.forEach((r, ri) => {
        const v = r[i];
        g.font = v === null ? `italic ${FONT}` : FONT;
        g.fillStyle = v === null ? col("--muted") : col("--fg");
        g.fillText(v === null ? "NULL" : v, x + PAD, ROW_H * (ri + 1) + ROW_H / 2);
      });
      x += layout.widths[i];
    });
    for (let r = 1; r <= cells.length + 1; r++) {
      g.beginPath();
      g.moveTo(0, r * ROW_H - 0.5);
      g.lineTo(w, r * ROW_H - 0.5);
      g.stroke();
    }
  }, [layout, columns, cells, theme]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`ตารางผลลัพธ์ ${columns.length} คอลัมน์ ${cells.length} แถว`}
      className="block select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}

export default function ResultTable({ columns, rows, scales = [], paginate = true, emptyText }) {
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows, size]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const shown = paginate ? rows.slice(page * size, page * size + size) : rows;
  const cells = useMemo(() => shown.map((r) => r.map((v, i) => formatCell(v, scales[i]))), [shown, scales]);
  const from = rows.length ? page * size + 1 : 0;
  const to = Math.min(rows.length, page * size + size);

  return (
    <div className="anim-fade space-y-2">
      {paginate && rows.length > 10 && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Show
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="rounded-md border border-line bg-bg px-1.5 py-0.5 text-fg">
            {SIZES.map((n) => <option key={n}>{n}</option>)}
          </select>
          entries
        </label>
      )}
      <div className="max-h-96 overflow-auto rounded-lg border border-line">
        <CanvasGrid columns={columns} cells={cells} />
        {rows.length === 0 && emptyText !== "" && <p className="px-3 py-3 text-sm text-muted">{emptyText ?? "ไม่มีแถวผลลัพธ์"}</p>}
      </div>
      {paginate && rows.length > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>Showing {from} to {to} of {rows.length} entries</span>
          {pages > 1 && (
            <span className="flex items-center gap-1">
              <button className="btn btn-ghost px-2 py-1 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="rounded-md border border-line px-2 py-0.5 text-fg">{page + 1}</span>
              <button className="btn btn-ghost px-2 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
