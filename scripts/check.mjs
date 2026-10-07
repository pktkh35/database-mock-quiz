// Validates the question bank, writes src/data/expected.json, measures grader speed.
import fs from "node:fs";
import path from "node:path";
import { questions } from "../src/data/questions.js";
import { buildExpected, gradeOne, normalizeRows } from "../src/lib/grade.js";
import { runQuery } from "../src/lib/engine/run.js";
import { checkRules } from "../src/lib/rules.js";

const problems = [];
const expected = {};
const ids = new Set();

for (const q of questions) {
  const tag = `[${q.id}]`;
  if (ids.has(q.id)) problems.push(`${tag} id ซ้ำ`);
  ids.add(q.id);
  if (!q.objective || q.objective.length < 10) problems.push(`${tag} ไม่มี objective (วัตถุประสงค์ของโจทย์)`);
  if (!q.rules || !((q.rules.require?.length ?? 0) + (q.rules.forbid?.length ?? 0) + (q.rules.tables?.length ?? 0))) problems.push(`${tag} ไม่มี rules ที่ตรวจเทคนิคตามวัตถุประสงค์`);
  if (!["select", "join", "outer", "agg", "sub"].includes(q.topic)) problems.push(`${tag} topic ไม่ถูกต้อง: ${q.topic}`);
  if (!["hr", "food", "sales", "shop", "university", "library"].includes(q.dataset)) problems.push(`${tag} dataset ไม่ถูกต้อง: ${q.dataset}`);
  try {
    const e = await buildExpected(q);
    expected[q.id] = e;
    if (e.count === 0) problems.push(`${tag} เฉลยได้ 0 แถว`);
    if (e.count >= 200) problems.push(`${tag} เฉลยได้ ${e.count}+ แถว (เกินเพดาน 200 แถวของระบบ) ให้เพิ่มเงื่อนไขให้ผลลัพธ์น้อยลง`);
    if (q.ordered) {
      const rows = normalizeRows(e.rows, true);
      const dup = new Set(rows.map((r) => JSON.stringify(r))).size !== rows.length;
      if (dup) problems.push(`${tag} ordered = true แต่ผลลัพธ์มีแถวซ้ำ (ลำดับไม่แน่นอน)`);
    }
    if (q.example) await runQuery(q.dataset, q.example.sql);
    const r = checkRules(q.rules, q.sql);
    if (!r.pass) problems.push(`${tag} เฉลยไม่ผ่านเงื่อนไขของตัวเอง: ${r.chips.filter((c) => !c.ok).map((c) => c.token).join(", ")}`);
  } catch (err) {
    problems.push(`${tag} เฉลย error: ${err.full ?? err.message}`);
  }
}

if (problems.length) {
  console.error("\nQuestion bank check FAILED:\n" + problems.map((p) => "  - " + p).join("\n") + "\n");
  process.exit(1);
}

fs.writeFileSync(path.join(process.cwd(), "src/data/expected.json"), JSON.stringify(expected));

// timing: grade every answer 20 rounds, fail if p95 per question > 20ms
const times = [];
for (let round = 0; round < 20; round++) {
  for (const q of questions) {
    const t0 = performance.now();
    await gradeOne(q, q.sql + " ", expected[q.id]);
    times.push(performance.now() - t0);
  }
}
times.sort((a, b) => a - b);
const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
console.log(`check ok: ${questions.length} questions, p95 ${p95.toFixed(2)} ms`);
if (p95 > 20) {
  console.error("p95 > 20ms: grader too slow");
  process.exit(1);
}
