"use client";

import { useState } from "react";
import { TOPICS } from "@/data/topics.js";

const COUNTS = [5, 10, 15, 20];
const MAX_COUNT = 50;

export default function TopicPicker({ pool, resume, onStart, onResume, loading, notice }) {
  const [picked, setPicked] = useState(new Set());
  const [count, setCount] = useState(5);
  const available = [...picked].reduce((n, id) => n + (pool[id] ?? 0), 0);
  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <main className="anim-page mx-auto w-full max-w-2xl px-4 py-12 sm:py-20">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          SQL Mock <span className="text-primary">Exam</span>
        </h1>
        <p className="mt-2 text-muted">เลือกหัวข้อ ระบบสุ่มโจทย์ให้ เขียน query ทดลองรัน แล้วส่งเพื่อดูคะแนนทันที</p>
      </header>

      {resume && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-primary-soft px-4 py-3">
          <span className="text-sm">
            ทำต่อจากที่ค้างไว้ <b>(ข้อ {resume.index + 1} / {resume.total})</b>
          </span>
          <button className="btn btn-primary" onClick={onResume}>ทำต่อ</button>
        </div>
      )}

      <section aria-labelledby="topics-h">
        <h2 id="topics-h" className="label mb-3">หัวข้อ · เลือกได้หลายหัวข้อ</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => {
            const on = picked.has(t.id);
            return (
              <button
                key={t.id}
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(t.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${on ? "border-primary bg-primary-soft" : "border-line hover:bg-surface"}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{t.name}</span>
                  <span aria-hidden className={`mt-0.5 grid size-4 place-items-center rounded border text-[10px] leading-none ${on ? "border-primary bg-primary text-white" : "border-line"}`}>
                    {on ? "✓" : ""}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted">{t.desc}</span>
                <span className="mt-2 block text-xs text-muted">{pool[t.id] ?? 0} โจทย์ในคลัง</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="count-h">
        <h2 id="count-h" className="label mb-3">จำนวนข้อ</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-line p-0.5" role="radiogroup" aria-labelledby="count-h">
            {COUNTS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={count === c}
                onClick={() => setCount(c)}
                className={`min-w-14 rounded-md px-4 py-1.5 text-sm font-medium ${count === c ? "bg-primary text-white" : "text-muted hover:text-fg"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            หรือกรอกเอง
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(Math.min(MAX_COUNT, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
              aria-label="จำนวนข้อที่ต้องการ"
              className="w-20 rounded-lg border border-line bg-bg px-3 py-1.5 text-center font-mono text-fg focus:border-primary"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          {picked.size ? `หัวข้อที่เลือกมีโจทย์ ${available} ข้อ` : "เลือกหัวข้อเพื่อดูจำนวนโจทย์ที่มี"} · สูงสุด {MAX_COUNT} ข้อต่อชุด
          {picked.size > 0 && count > available ? ` · จะได้ ${available} ข้อ (เท่าที่มี)` : ""}
        </p>
      </section>

      {notice && <p role="status" className="mt-6 text-sm text-primary-strong">{notice}</p>}

      <div className="mt-10 flex items-center gap-4">
        <button className="btn btn-primary px-6 py-2.5" disabled={!picked.size || loading} onClick={() => onStart([...picked], count)}>
          {loading ? "กำลังสุ่มโจทย์…" : "เริ่มทำข้อสอบ"}
        </button>
        {!picked.size && <span className="text-sm text-muted">เลือกอย่างน้อย 1 หัวข้อ</span>}
      </div>
    </main>
  );
}
