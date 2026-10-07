"use client";

import { TOPICS, DATASET_LABELS } from "@/data/topics.js";
import { formatDuration } from "@/lib/client.js";
import ResultTable from "./ResultTable.js";

const BADGE = {
  correct: { icon: "✓", text: "ถูก", cls: "text-ok border-ok" },
  wrong: { icon: "✗", text: "ผิด", cls: "text-bad border-bad" },
  unanswered: { icon: "–", text: "ไม่ได้ตอบ", cls: "text-muted border-line" },
};

function Code({ children }) {
  return <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{children || <span className="text-muted">(ว่าง)</span>}</pre>;
}

export default function ResultPage({ result, onRestart }) {
  const { correct, total, percent, byTopic, items, durationMs } = result;
  return (
    <main className="anim-page mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <p className="label">ผลคะแนน</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-1">
        <p className="text-7xl font-semibold tracking-tight text-primary tabular-nums">
          {correct}<span className="text-3xl text-muted"> / {total}</span>
        </p>
        <p className="pb-2 text-lg text-muted">{percent}% · เวลา {formatDuration(durationMs ?? 0)}</p>
      </div>

      <section className="mt-10" aria-labelledby="bt">
        <h2 id="bt" className="label mb-3">แยกตามหัวข้อ</h2>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {Object.entries(byTopic).map(([id, v]) => (
            <li key={id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>{TOPICS.find((t) => t.id === id)?.name ?? id}</span>
              <span className="flex items-center gap-3">
                <span className="h-1 w-24 rounded bg-line" aria-hidden><span className="block h-full rounded bg-primary" style={{ width: `${(v.correct / v.total) * 100}%` }} /></span>
                <span className="w-12 text-right font-mono text-sm tabular-nums">{v.correct} / {v.total}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="ql">
        <h2 id="ql" className="label mb-3">รายข้อ</h2>
        <ul className="space-y-2">
          {items.map((it, i) => {
            const b = BADGE[it.status];
            return (
              <li key={it.id}>
                <details className="group rounded-lg border border-line">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${b.cls}`}>
                      <span aria-hidden>{b.icon}</span> {b.text}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm"><b>ข้อ {i + 1}</b> · {it.text}</span>
                      {it.reason && <span className="mt-0.5 block text-xs text-muted">{it.reason}</span>}
                    </span>
                    <span aria-hidden className="text-muted transition-transform group-open:rotate-90">›</span>
                  </summary>
                  <div className="anim-fade space-y-4 border-t border-line px-4 py-4">
                    <p className="text-xs text-muted">{TOPICS.find((t) => t.id === it.topic)?.name} · {it.dataset} ({DATASET_LABELS[it.dataset]})</p>
                    {it.objective && (
                      <div className="rounded-lg border border-line bg-surface p-3">
                        <p className="label mb-1">วัตถุประสงค์ของโจทย์</p>
                        <p className="text-sm">{it.objective}</p>
                        {it.techniques?.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2" aria-label="เทคนิคที่ตรวจ">
                            {it.techniques.map((t, k) => (
                              <li key={k} className={`chip ${t.ok ? "border-ok text-ok" : "border-bad text-bad"}`}>
                                <span aria-hidden>{t.ok ? "✓" : "✗"}</span>
                                {t.kind === "forbid" ? "ไม่ใช้" : "ใช้"} {t.label}
                                <span className="sr-only">{t.ok ? "ผ่าน" : "ไม่ผ่าน"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <div><p className="label mb-1">SQL ของคุณ</p><Code>{it.userSql}</Code></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="min-w-0">
                        <p className="label mb-1">ผลลัพธ์ของคุณ</p>
                        {it.userResult ? <ResultTable columns={it.userResult.columns} rows={it.userResult.rows} scales={it.userResult.scales} /> : <p className="text-sm text-muted">ไม่มีผลลัพธ์</p>}
                      </div>
                      <div className="min-w-0">
                        <p className="label mb-1">ผลลัพธ์ที่ถูก</p>
                        <ResultTable columns={it.expected.columns} rows={it.expected.rows} scales={it.expected.scales} />
                      </div>
                    </div>
                    <div><p className="label mb-1">SQL เฉลย</p><Code>{it.solutionSql}</Code></div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-12">
        <button className="btn btn-primary px-6 py-2.5" onClick={onRestart}>ทำชุดใหม่</button>
      </div>
    </main>
  );
}
