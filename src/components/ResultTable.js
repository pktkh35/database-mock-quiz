"use client";

import { useEffect, useState } from "react";
import { formatCell } from "@/lib/client.js";

const SIZES = [10, 25, 50, 100];

export default function ResultTable({ columns, rows, scales = [], paginate = true }) {
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows, size]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const shown = paginate ? rows.slice(page * size, page * size + size) : rows;
  const from = rows.length ? page * size + 1 : 0;
  const to = Math.min(rows.length, page * size + size);
  const showControls = paginate && rows.length > 10;

  return (
    <div className="anim-fade space-y-2">
      {showControls && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Show
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="rounded-md border border-line bg-bg px-1.5 py-0.5 text-fg">
            {SIZES.map((n) => <option key={n}>{n}</option>)}
          </select>
          entries
        </label>
      )}
      <div className="max-h-96 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-xs font-medium text-muted">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length || 1} className="px-3 py-3 text-muted">ไม่มีแถวผลลัพธ์</td></tr>
            )}
            {shown.map((r, ri) => (
              <tr key={ri} className="transition-colors hover:bg-surface">
                {r.map((v, ci) => {
                  const f = formatCell(v, scales[ci]);
                  return (
                    <td key={ci} className="whitespace-nowrap border-b border-line px-3 py-1.5 font-mono text-[13px]">
                      {f === null ? <span className="italic text-muted">NULL</span> : f}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
