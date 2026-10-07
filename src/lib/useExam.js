"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearState, emptyState, loadState, saveState } from "./storage.js";

export function useExam() {
  const [state, setState] = useState(emptyState);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const timer = useRef(null);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    const { state: s, storageOk: ok } = loadState();
    setState(s);
    setStorageOk(ok);
    setReady(true);
  }, []);

  // debounced persist (400 ms)
  useEffect(() => {
    if (!ready) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (saveState(latest.current)) setDraftSavedAt(Date.now());
      else setStorageOk(false);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [state, ready]);

  useEffect(() => {
    const flush = () => saveState(latest.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const patch = useCallback((p) => setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })), []);

  // Re-sync question content (e.g. sample output) from the server for an in-progress exam.
  const refreshQuestions = useCallback(async () => {
    const s = latest.current;
    if (!s.questionIds.length || s.submittedAt) return;
    try {
      const res = await fetch(`/api/exam?ids=${s.questionIds.join(",")}`);
      const { questions } = await res.json();
      const byId = new Map(questions.map((q) => [q.id, q]));
      patch((cur) => ({ questions: cur.questions.map((q) => byId.get(q.id) ?? q) }));
    } catch {}
  }, [patch]);

  const begin = useCallback((questions) => {
    setState({ ...emptyState(), questionIds: questions.map((q) => q.id), questions, startedAt: Date.now() });
    setDraftSavedAt(null);
  }, []);

  const setDraft = (id, sql) => patch((s) => ({ drafts: { ...s.drafts, [id]: sql } }));
  const save = (id) => patch((s) => ({ saved: { ...s.saved, [id]: s.drafts[id] ?? "" } }));
  const clear = (id) => patch((s) => ({ drafts: { ...s.drafts, [id]: "" } }));
  const goto = (i) => patch((s) => ({ currentIndex: Math.max(0, Math.min(s.questionIds.length - 1, i)) }));
  const setPlayground = (playground) => patch({ playground });
  const finish = (result, saved) => patch({ submittedAt: Date.now(), result, saved: saved ?? latest.current.saved });
  const reset = () => {
    clearState();
    setState(emptyState());
    setDraftSavedAt(null);
  };

  return { refreshQuestions, state, ready, storageOk, draftSavedAt, begin, setDraft, save, clear, goto, setPlayground, finish, reset };
}
