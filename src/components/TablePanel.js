"use client";

export default function TablePanel({ schema, onPick }) {
  return (
    <section aria-labelledby="tbl-h" className="min-w-0">
      <h2 id="tbl-h" className="label mb-2">Table · กดเพื่อดูข้อมูล</h2>
      <ul className="flex flex-wrap gap-2">
        {Object.keys(schema ?? {}).map((t) => (
          <li key={t} className="inline-flex overflow-hidden rounded-lg border border-line">
            <button className="px-3 py-1.5 font-mono text-sm font-semibold text-primary-strong hover:bg-surface" onClick={() => onPick(`SELECT * FROM ${t}`)}>{t}</button>
            <button
              aria-label={`DESCRIBE ${t}`}
              title={`DESCRIBE ${t}`}
              onClick={() => onPick(`DESCRIBE ${t}`)}
              className="grid w-8 place-items-center border-l border-line text-muted hover:bg-surface hover:text-fg"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden><rect x="6" y="1" width="4" height="4" rx=".5"/><rect x="1" y="11" width="4" height="4" rx=".5"/><rect x="6" y="11" width="4" height="4" rx=".5"/><rect x="11" y="11" width="4" height="4" rx=".5"/><path d="M8 5v3M3 11V8h10v3M8 8v3" stroke="currentColor" fill="none"/></svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
