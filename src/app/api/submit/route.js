import { gradeAll } from "@/lib/grade.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const { questionIds, saved } = body ?? {};
  if (!Array.isArray(questionIds) || questionIds.length > 50 || typeof saved !== "object") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const answers = questionIds.map((id) => [id, typeof saved?.[id] === "string" ? saved[id].slice(0, 5000) : ""]);
  const items = await gradeAll(answers);
  const correct = items.filter((i) => i.status === "correct").length;
  const byTopic = {};
  for (const i of items) {
    byTopic[i.topic] ??= { correct: 0, total: 0 };
    byTopic[i.topic].total++;
    if (i.status === "correct") byTopic[i.topic].correct++;
  }
  return Response.json({ correct, total: items.length, percent: items.length ? Math.round((correct / items.length) * 100) : 0, byTopic, items });
}
