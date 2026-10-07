import crypto from "node:crypto";
import { questions } from "../data/questions.js";
import { runQuery } from "./engine/run.js";
import { checkRules, labelOf } from "./rules.js";

export function normalizeValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  return String(v).trim();
}

export function normalizeRows(rows, ordered) {
  const out = rows.map((r) => r.map(normalizeValue));
  if (!ordered) out.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0));
  return out;
}

export function hashRows(rows) {
  return crypto.createHash("sha1").update(JSON.stringify(rows)).digest("hex");
}

export const byId = new Map(questions.map((q) => [q.id, q]));

let expectedCache = null;
async function loadExpected() {
  if (expectedCache) return expectedCache;
  const fs = await import("node:fs");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "src/data/expected.json");
  expectedCache = JSON.parse(fs.readFileSync(file, "utf8"));
  return expectedCache;
}

/** Build expected entry for a question by running its answer (used by check script). */
export async function buildExpected(q) {
  const r = await runQuery(q.dataset, q.sql);
  return {
    columns: r.columns,
    scales: r.scales,
    rows: r.rows,
    count: r.rows.length,
    hash: hashRows(normalizeRows(r.rows, q.ordered)),
  };
}

function ruleReason(chips) {
  const bad = chips.filter((c) => !c.ok);
  return bad
    .map((c) =>
      c.kind === "forbid"
        ? `ใช้ ${labelOf(c.kind, c.token)} ซึ่งโจทย์ห้ามใช้`
        : `ไม่ได้ใช้ ${labelOf(c.kind, c.token)} ตามวัตถุประสงค์ของโจทย์`
    )
    .join(", ");
}

export async function gradeOne(q, userSql, expected) {
  const base = {
    id: q.id, topic: q.topic, dataset: q.dataset, text: q.text,
    objective: q.objective, userSql: userSql ?? "", solutionSql: q.sql,
    expected: { columns: expected.columns, scales: expected.scales, rows: expected.rows },
  };
  const chipsOf = (r) => r.chips.map((c) => ({ ok: c.ok, kind: c.kind, label: labelOf(c.kind, c.token) }));
  if (!userSql || !userSql.trim()) return { ...base, status: "unanswered", reason: "ไม่ได้ตอบ" };

  const rule = checkRules(q.rules, userSql);
  base.techniques = chipsOf(rule);
  let user;
  try {
    user = await runQuery(q.dataset, userSql, { limit: expected.count + 1 });
  } catch (e) {
    return { ...base, status: "wrong", reason: `รัน SQL ไม่ได้: ${e.full ?? e.message}` };
  }
  const userResult = { columns: user.columns, scales: user.scales, rows: user.rows };

  let resultReason = null;
  if (user.columns.length !== expected.columns.length) {
    resultReason = `จำนวนคอลัมน์ไม่ตรง (ของคุณ ${user.columns.length}, ที่ถูก ${expected.columns.length})`;
  } else if (user.rows.length !== expected.count) {
    resultReason = `จำนวนแถวไม่ตรง (ของคุณ ${user.truncated ? `มากกว่า ${expected.count}` : user.rows.length}, ที่ถูก ${expected.count})`;
  } else if (hashRows(normalizeRows(user.rows, q.ordered)) !== expected.hash) {
    const sameSet =
      q.ordered &&
      hashRows(normalizeRows(user.rows, false)) === hashRows(normalizeRows(expected.rows, false));
    resultReason = sameSet ? "ลำดับแถวไม่ตรง" : "ข้อมูลในผลลัพธ์ไม่ตรงกับที่ถูก";
  }

  if (!resultReason && rule.pass) return { ...base, userResult, status: "correct", reason: "" };
  if (!resultReason) {
    return { ...base, userResult, status: "wrong", ruleFail: true, reason: `ผลลัพธ์ถูก แต่${ruleReason(rule.chips)}` };
  }
  const extra = rule.pass ? "" : ` · และ${ruleReason(rule.chips)}`;
  return { ...base, userResult, status: "wrong", reason: resultReason + extra };
}

export async function gradeAll(answers) {
  const expectedAll = await loadExpected();
  const results = [];
  for (const [id, sql] of answers) {
    const q = byId.get(id);
    if (!q || !expectedAll[id]) continue;
    results.push(await gradeOne(q, sql, expectedAll[id]));
  }
  return results;
}
