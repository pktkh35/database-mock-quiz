import { questions, publicQuestion } from "@/data/questions.js";
import { runQuery } from "@/lib/engine/run.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const withExample = async (q) => {
    const pub = publicQuestion(q);
    if (!q.example) return pub;
    const { columns, rows, scales } = await runQuery(q.dataset, q.example.sql);
    return { ...pub, example: { columns, rows, scales } };
  };
  if (params.has("ids")) {
    const ids = params.get("ids").split(",").filter(Boolean).slice(0, 50);
    const found = questions.filter((q) => ids.includes(q.id));
    return Response.json({ questions: await Promise.all(found.map(withExample)) });
  }
  const topics = (params.get("topics") ?? "").split(",").filter(Boolean);
  const count = Math.min(50, Math.max(1, Number(params.get("count")) || 5));
  if (!params.has("topics")) {
    const pool = {};
    for (const q of questions) pool[q.topic] = (pool[q.topic] ?? 0) + 1;
    return Response.json({ pool });
  }
  if (!topics.length) return Response.json({ error: "เลือกอย่างน้อย 1 หัวข้อ" }, { status: 400 });

  const pools = shuffle(topics).map((t) => shuffle(questions.filter((q) => q.topic === t))).filter((p) => p.length);
  const picked = [];
  while (picked.length < count && pools.some((p) => p.length)) {
    for (const p of shuffle(pools)) {
      if (picked.length >= count) break;
      // prefer a dataset not yet used by the last pick
      const last = picked[picked.length - 1]?.dataset;
      const i = Math.max(0, p.findIndex((q) => q.dataset !== last));
      if (p.length) picked.push(p.splice(i, 1)[0]);
    }
  }
  const out = await Promise.all(shuffle(picked).map(withExample));
  return Response.json({
    questions: out,
    requested: count,
    shortage: picked.length < count,
  });
}
