"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TOPICS, DATASET_LABELS } from "@/data/topics.js";
import { countStatements, fetchSchema, formatDuration, runSql } from "@/lib/client.js";
import ConfirmDialog from "./ConfirmDialog.js";
import QuestionNav, { questionStatus } from "./QuestionNav.js";
import ResultTable from "./ResultTable.js";
import TablePanel from "./TablePanel.js";

const SqlEditor = dynamic(() => import("./SqlEditor.js"), { ssr: false, loading: () => <div className="h-52 rounded-lg border border-line" /> });

function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export default function ExamView({ exam, onSubmitted, onExit }) {
  const { state, storageOk, draftSavedAt } = exam;
  const { questionIds, questions, currentIndex, drafts, saved, startedAt } = state;
  const q = questions[currentIndex];
  const draft = drafts[q.id] ?? "";
  const savedSql = saved[q.id] ?? "";
  const now = useNow(true);

  const [schemas, setSchemas] = useState({});
  const [runs, setRuns] = useState({});
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // 'clear' | 'submit'
  const [submitting, setSubmitting] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    if (!schemas[q.dataset]) fetchSchema(q.dataset).then((t) => setSchemas((s) => ({ ...s, [q.dataset]: t })));
  }, [q.dataset, schemas]);
  const schema = schemas[q.dataset];


  const run = runs[q.id];
  const status = questionStatus(draft, savedSql);
  const savedCount = questionIds.filter((id) => (saved[id] ?? "").trim()).length;
  const emptyCount = questionIds.filter((id) => !(drafts[id] ?? "").trim() && !(saved[id] ?? "").trim()).length;
  const unsavedCount = questionIds.filter((id) => (drafts[id] ?? "").trim() && drafts[id] !== saved[id]).length;

  const put = (v) => setRuns((r) => ({ ...r, [q.id]: v }));

  // Runs any SQL into the Result panel (answer text is untouched).
  const runInto = async (sql) => {
    if (!sql.trim()) return put({ sql, error: { full: "ยังไม่ได้เขียน SQL" } });
    if (countStatements(sql) > 1)
      return put({ sql, error: { full: "คำตอบ 1 ข้อต้องเป็น SELECT 1 คำสั่ง กรุณาเหลือคำสั่งเดียว (ลบ ; ที่คั่นคำสั่ง) ก่อนรัน" } });
    setBusy(true);
    try {
      put({ sql, ...(await runSql(q.dataset, sql, true)) });
    } catch {
      put({ sql, error: { full: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" } });
    }
    setBusy(false);
  };
  const execute = () => runInto(draft);

  const save = () => {
    if (!draft.trim()) return;
    exam.save(q.id);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  };

  const isLast = currentIndex === questionIds.length - 1;
  const canSave = !!draft.trim() && status !== "saved";
  const canSaveNext = !!draft.trim() && !isLast;
  const saveNext = () => {
    if (!canSaveNext) return;
    if (status !== "saved") exam.save(q.id);
    exam.goto(currentIndex + 1);
  };

  const submit = async (saveAll) => {
    setSubmitting(true);
    const finalSaved = { ...saved };
    if (saveAll) for (const id of questionIds) if ((drafts[id] ?? "").trim()) finalSaved[id] = drafts[id];
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionIds, saved: finalSaved }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      exam.finish({ ...result, durationMs: Date.now() - startedAt }, finalSaved);
      onSubmitted();
    } catch {
      setSubmitting(false);
      setDialog("error");
    }
  };

  const topic = TOPICS.find((t) => t.id === q.topic);
  const lineErr = run?.sql === draft ? run?.error?.line : undefined;

  const actions = (
    <>
      <button className="btn flex-1 whitespace-nowrap px-1.5 text-[13px] sm:text-sm" onClick={execute} disabled={busy}>{busy ? "…" : "Execute"}</button>
      <button className="btn btn-primary flex-1 whitespace-nowrap px-1.5 text-[13px] sm:text-sm" onClick={save} disabled={!canSave}>
        {saveFlash ? "Saved ✓" : "Save"}
      </button>
      {!isLast && (
        <button className="btn btn-primary flex-1 whitespace-nowrap px-1.5 text-[13px] sm:text-sm" onClick={saveNext} disabled={!canSaveNext} aria-label="Save and Next">
          <span className="hidden sm:inline">Save &amp; Next</span><span className="sm:hidden">Save ›</span>
        </button>
      )}
    </>
  );
  const prev = () => exam.goto(currentIndex - 1);
  const next = () => exam.goto(currentIndex + 1);

  return (
    <div className="anim-fade min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
          <button onClick={onExit} className="text-sm font-semibold tracking-tight" aria-label="กลับหน้าเลือกหัวข้อ">
            SQL Mock <span className="text-primary">Exam</span>
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted">
              <b className="text-fg">{savedCount}</b>/{questionIds.length}<span className="hidden sm:inline"> Save แล้ว</span>
            </span>
            <span className="font-mono tabular-nums text-muted" aria-label="เวลาที่ใช้">{formatDuration(now - startedAt)}</span>
            <button className="btn btn-primary px-3 py-1.5" onClick={() => setDialog("submit")} disabled={submitting}>Submit</button>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 pb-2.5">
          <QuestionNav ids={questionIds} current={currentIndex} drafts={drafts} saved={saved} onGo={exam.goto} />
        </div>
        <div className="h-0.5 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={questionIds.length} aria-valuenow={savedCount} aria-label="ความคืบหน้า">
          <div className="h-full bg-primary transition-all" style={{ width: `${(savedCount / questionIds.length) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <section key={`q-${q.id}`} aria-labelledby="q-title" className="anim-page min-w-0 space-y-4 lg:sticky lg:top-[120px] lg:max-h-[calc(100vh-140px)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="q-title" className="text-sm font-semibold">ข้อ {currentIndex + 1} <span className="font-normal text-muted">/ {questionIds.length}</span></h1>
            <span className="chip">{topic?.name}</span>
            <span className="chip font-mono">{q.dataset} · {DATASET_LABELS[q.dataset]}</span>
          </div>
          <p className="text-lg leading-relaxed">{q.text}</p>
          {q.example?.rows && (
            <div className="space-y-2">
              <p className="label">ตัวอย่างผลลัพธ์{q.example.headerOnly ? ` (รูปแบบคอลัมน์ · ผลลัพธ์มี ${q.example.total} แถว)` : q.example.auto ? ` (2 แถวแรกจากทั้งหมด ${q.example.total} แถว)` : ""}</p>
              <ResultTable columns={q.example.columns} rows={q.example.rows} scales={q.example.scales} paginate={false} emptyText={q.example.headerOnly ? "" : undefined} />
            </div>
          )}
        </section>

        <main className="min-w-0 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted" role="status">
              <span className="flex items-center gap-2">
                <span className="label">Answer</span>
                <button className="btn btn-ghost px-2 py-0.5 text-xs lg:hidden" onClick={() => setDialog("clear")} disabled={!draft}>Clear</button>
              </span>
              <span className="text-right">
                {status === "saved" && <span className="text-ok">✓ Save แล้ว</span>}
                {status === "draft" && <span className="text-primary-strong">• ยังไม่ได้ Save</span>}
                {status === "empty" && "ยังไม่ได้ตอบ"}
                <span className="hidden sm:inline">
                  {" · "}{!storageOk ? "ปิดหน้าแล้วร่างจะหาย" : draftSavedAt ? `บันทึกร่างแล้ว ${new Date(draftSavedAt).toLocaleTimeString("th-TH")}` : "ยังไม่มีร่าง"}
                </span>
              </span>
            </div>
            <SqlEditor
              key={`ed-${q.id}`}
              value={draft}
              onChange={(v) => exam.setDraft(q.id, v)}
              onExecute={execute}
              onSave={save}
              schema={schema}
              errorLine={lineErr}
              errorMessage={run?.error?.full}
              ariaLabel={`คำตอบข้อ ${currentIndex + 1}`}
              lines={10}
            />
            <div className="mt-3 hidden items-center gap-2 lg:flex">
              <button className="btn" onClick={execute} disabled={busy}>{busy ? "กำลังรัน…" : "Execute"}</button>
              <button className="btn" onClick={() => setDialog("clear")} disabled={!draft}>Clear</button>
              <span className="ml-auto flex items-center gap-2">
                <button className="btn btn-primary" onClick={save} disabled={!canSave}>
                  {saveFlash ? "Saved ✓" : "Save"}
                </button>
                {!isLast && (
                  <button className="btn btn-primary" onClick={saveNext} disabled={!canSaveNext}>Save &amp; Next →</button>
                )}
              </span>
            </div>
            <p className="mt-2 hidden text-xs text-muted sm:block">⌘/Ctrl + Enter = Execute · ⌘/Ctrl + S = Save · Execute รัน SHOW TABLES / DESCRIBE ได้ แต่ตรวจเฉพาะ SELECT</p>
          </div>

          <TablePanel schema={schema} onPick={runInto} />

          <section aria-live="polite" aria-labelledby="res-h" className="min-w-0 space-y-3">
            <h2 id="res-h" className="text-base font-semibold">Result</h2>
            {!run && <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">กด Execute หรือเลือกตารางเพื่อดูผลลัพธ์</p>}
            {run && (
              <div key={run.sql + (run.ms ?? "") + (run.error ? "e" : "")} className="anim-fade space-y-3">
                {run.sql.trim() && <p className="rounded-lg border border-line bg-primary-soft px-4 py-3 font-mono text-sm break-all text-primary-strong">{run.sql}</p>}
                {run.error ? (
                  <p role="alert" className="rounded-lg border border-bad px-3 py-2 font-mono text-sm text-bad">✗ {run.error.full ?? run.error.message}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted">{run.rows.length} แถว{run.truncated ? " (แสดง 200 แถวแรก)" : ""} · {run.ms} ms</p>
                    <ResultTable columns={run.columns} rows={run.rows} scales={run.scales} />
                  </>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
          <button className="btn shrink-0 px-2.5 sm:px-3" onClick={prev} disabled={currentIndex === 0} aria-label="Previous">
            ← <span className="hidden sm:inline">Previous</span>
          </button>
          <div className="flex min-w-0 flex-1 gap-1.5 sm:gap-2 lg:hidden">
            {actions}
          </div>
          <div className="hidden flex-1 lg:block" />
          <button className="btn shrink-0 px-2.5 sm:px-3" onClick={next} disabled={currentIndex === questionIds.length - 1} aria-label="Next">
            <span className="hidden sm:inline">Next</span> →
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "clear"}
        title="ล้างคำตอบข้อนี้?"
        confirmLabel="ล้างคำตอบ"
        onCancel={() => setDialog(null)}
        onConfirm={() => { exam.clear(q.id); setRuns((r) => ({ ...r, [q.id]: undefined })); setDialog(null); }}
      >
        ร่างของข้อ {currentIndex + 1} จะถูกล้าง{savedSql ? " (คำตอบที่ Save ไว้ยังอยู่จนกว่าจะ Save ใหม่)" : ""}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "submit"}
        title="ส่งข้อสอบ?"
        confirmLabel={submitting ? "กำลังตรวจ…" : "ส่งเลย"}
        onCancel={() => setDialog(null)}
        onConfirm={() => submit(false)}
        extra={unsavedCount > 0 && <button className="btn" disabled={submitting} onClick={() => submit(true)}>Save ร่างทั้งหมดแล้วส่ง</button>}
      >
        <ul className="space-y-1">
          <li>Save แล้ว {savedCount} / {questionIds.length} ข้อ</li>
          <li>ข้อที่ยังว่าง: {emptyCount} ข้อ</li>
          <li>มีร่างแต่ยังไม่ Save: {unsavedCount} ข้อ {unsavedCount > 0 && "(จะไม่ถูกตรวจ ถ้าส่งตอนนี้)"}</li>
        </ul>
        <p className="mt-3 text-fg">ส่งแล้วแก้ไขไม่ได้</p>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === "error"} title="ส่งไม่สำเร็จ" confirmLabel="ลองใหม่" onCancel={() => setDialog(null)} onConfirm={() => submit(false)}>
        เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ คำตอบของคุณยังอยู่ ลองส่งอีกครั้ง
      </ConfirmDialog>
    </div>
  );
}
