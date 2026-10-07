"use client";

import { useEffect, useState } from "react";
import { useExam } from "@/lib/useExam.js";
import TopicPicker from "./TopicPicker.js";
import ExamView from "./ExamView.js";
import ResultPage from "./ResultPage.js";

export default function App() {
  const exam = useExam();
  const { state, ready } = exam;
  const [view, setView] = useState(null); // topics | exam | result
  const [pool, setPool] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (ready && view === null) setView(state.submittedAt ? "result" : "topics");
  }, [ready, view, state.submittedAt]);

  useEffect(() => {
    if (ready) exam.refreshQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    fetch("/api/exam").then((r) => r.json()).then((d) => setPool(d.pool ?? {})).catch(() => {});
  }, []);

  const start = async (topics, count) => {
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch(`/api/exam?topics=${topics.join(",")}&count=${count}`);
      const data = await res.json();
      if (!res.ok || !data.questions?.length) throw new Error(data.error);
      exam.begin(data.questions);
      if (data.shortage) setNotice(`คลังมีโจทย์ไม่พอ ใช้ ${data.questions.length} ข้อจากที่เลือก ${data.requested} ข้อ`);
      setView("exam");
    } catch {
      setNotice("สุ่มโจทย์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
    setLoading(false);
  };

  if (!ready || view === null) return <div className="min-h-screen" aria-busy="true" />;

  if (view === "result" && state.result) {
    return <ResultPage result={state.result} onRestart={() => { exam.reset(); setNotice(""); setView("topics"); }} />;
  }
  if (view === "exam" && state.questions.length && !state.submittedAt) {
    return (
      <>
        {notice && <p role="status" className="bg-primary-soft px-4 py-2 text-center text-sm text-primary-strong">{notice}</p>}
        <ExamView exam={exam} onSubmitted={() => setView("result")} onExit={() => setView("topics")} />
      </>
    );
  }
  const inProgress = state.questionIds.length && !state.submittedAt;
  return (
    <TopicPicker
      pool={pool}
      loading={loading}
      notice={notice}
      resume={inProgress ? { index: state.currentIndex, total: state.questionIds.length } : null}
      onResume={() => setView("exam")}
      onStart={start}
    />
  );
}
