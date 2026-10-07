// AST-based rule checker. Shared by browser (live chips) and server (grader).
import { parseSelect, walk } from "./engine/parse.js";

const KEYWORDS = {
  EQUIJOIN: (ctx) => ctx.commaJoin && ctx.joins.length === 0,
  "NATURAL JOIN": (ctx) => ctx.joins.some((j) => /^NATURAL/i.test(j)),
  "CROSS JOIN": (ctx) => ctx.joins.some((j) => /^CROSS/i.test(j)),
  USING: (ctx) => ctx.using,
  ON: (ctx) => ctx.on,
  UNION: (ctx) => ctx.union,
  "SELF JOIN": (ctx) => ctx.selfJoin,
  JOIN: (ctx) => ctx.joins.length > 0 || ctx.commaJoin,
  "INNER JOIN": (ctx) => ctx.joins.some((j) => /^(INNER\s+)?JOIN$/i.test(j) || /^INNER/i.test(j)),
  "LEFT JOIN": (ctx) => ctx.joins.some((j) => /^LEFT/i.test(j)),
  "RIGHT JOIN": (ctx) => ctx.joins.some((j) => /^RIGHT/i.test(j)),
  "NOT IN": (ctx) => ctx.ops.has("NOT IN"),
  IN: (ctx) => ctx.ops.has("IN"),
  EXISTS: (ctx) => ctx.ops.has("EXISTS") || ctx.ops.has("NOT EXISTS") || ctx.funcs.has("EXISTS"),
  AND: (ctx) => ctx.ops.has("AND"),
  OR: (ctx) => ctx.ops.has("OR"),
  NOT: (ctx) => [...ctx.ops].some((o) => o.startsWith("NOT")),
  "NOT EXISTS": (ctx) => ctx.ops.has("NOT EXISTS"),
  "NOT BETWEEN": (ctx) => ctx.ops.has("NOT BETWEEN"),
  "NOT LIKE": (ctx) => ctx.ops.has("NOT LIKE"),
  BETWEEN: (ctx) => ctx.ops.has("BETWEEN") || ctx.ops.has("NOT BETWEEN"),
  LIKE: (ctx) => ctx.ops.has("LIKE") || ctx.ops.has("NOT LIKE"),
  "IS NULL": (ctx) => ctx.ops.has("IS"),
  "IS NOT NULL": (ctx) => ctx.ops.has("IS NOT"),
  DISTINCT: (ctx) => ctx.distinct,
  "GROUP BY": (ctx) => ctx.groupBy,
  HAVING: (ctx) => ctx.having,
  "ORDER BY": (ctx) => ctx.orderBy,
  LIMIT: (ctx) => ctx.limit,
  WHERE: (ctx) => ctx.where,
};

function analyze(root) {
  const ctx = {
    joins: [], commaJoin: false, ops: new Set(), funcs: new Set(), literals: new Set(),
    tables: new Set(), distinct: false, groupBy: false, having: false, orderBy: false,
    limit: false, where: false, using: false, on: false, union: false, selfJoin: false, subquery: false, subInWhere: false, subInFrom: false,
  };
  const seen = new Set();
  const visitSelect = (sel, depth) => {
    if (!sel || sel.type !== "select" || seen.has(sel)) return;
    seen.add(sel);
    if (depth > 0) ctx.subquery = true;
    if (sel.distinct) ctx.distinct = true;
    if (sel.groupby) ctx.groupBy = true;
    if (sel.having) ctx.having = true;
    if (sel.orderby) ctx.orderBy = true;
    if (sel.limit && sel.limit.value?.length) ctx.limit = true;
    if (sel.where) ctx.where = true;
    const from = Array.isArray(sel.from) ? sel.from : [];
    const names = from.filter((f) => typeof f.table === "string").map((f) => f.table.toLowerCase());
    if (new Set(names).size < names.length) ctx.selfJoin = true;
    if (sel._next) {
      ctx.union = true;
      visitSelect(sel._next, depth);
    }
    from.forEach((f, i) => {
      if (f.natural) ctx.joins.push("NATURAL JOIN");
      else if (f.join) ctx.joins.push(String(f.join));
      if (f.using) ctx.using = true;
      if (f.on) ctx.on = true;
      else if (i > 0 && !f.join) ctx.commaJoin = true;
      if (typeof f.table === "string") ctx.tables.add(f.table.toLowerCase());
      if (f.expr?.ast) {
        ctx.subInFrom = true;
        visitSelect(f.expr.ast, depth + 1);
      }
    });
    const inWhere = (node) => {
      walk(node, (n) => {
        if (n !== node && n.ast && n.ast.type === "select") {
          ctx.subInWhere = true;
        }
      });
    };
    if (sel.where) inWhere(sel.where);
    if (sel.having) inWhere(sel.having);
  };
  visitSelect(root, 0);
  walk(root, (n) => {
    if (n.type === "binary_expr" && typeof n.operator === "string") ctx.ops.add(n.operator.toUpperCase());
    if (n.type === "unary_expr" && typeof n.operator === "string") ctx.ops.add(n.operator.toUpperCase());
    if (n.type === "aggr_func" && n.name) ctx.funcs.add(String(n.name).toUpperCase());
    if (n.type === "function" && n.name) {
      const nm = n.name.name ? n.name.name.map((p) => p.value).join(".") : String(n.name);
      ctx.funcs.add(nm.toUpperCase());
    }
    if (n.type === "number") ctx.literals.add(String(n.value));
    if (/string$/.test(n.type ?? "") && typeof n.value === "string") ctx.literals.add(n.value);
    if (n.type === "aggr_func" && n.args?.distinct) ctx.distinct = true;
    if (n.ast && n.ast.type === "select" && n !== root) visitSelect(n.ast, 1);
  });
  return ctx;
}

function evaluate(token, ctx) {
  const t = token.toUpperCase();
  if (t === "SUBQUERY") return ctx.subquery;
  if (t === "SUBQUERY_IN_WHERE") return ctx.subInWhere;
  if (t === "SUBQUERY_IN_FROM") return ctx.subInFrom;
  if (t.startsWith("LITERAL:")) return ctx.literals.has(token.slice(8));
  if (KEYWORDS[t]) return !!KEYWORDS[t](ctx);
  return ctx.funcs.has(t);
}

export function labelOf(kind, token) {
  const base = token.startsWith("LITERAL:") ? `ค่า ${token.slice(8)}` : token.replace(/_/g, " ");
  return kind === "tables" ? `ตาราง ${token}` : base;
}

/** rules: {require?, forbid?, tables?}. Returns chips [{kind,token,ok}] or null when SQL does not parse. */
export function checkRules(rules, sql) {
  if (!rules) return { chips: [], pass: true, parsed: true };
  const chips = [];
  let ctx = null;
  try {
    ctx = analyze(parseSelect(sql));
  } catch {
    ctx = null;
  }
  for (const token of rules.require ?? []) chips.push({ kind: "require", token, ok: ctx ? evaluate(token, ctx) : false });
  for (const token of rules.forbid ?? []) chips.push({ kind: "forbid", token, ok: ctx ? !evaluate(token, ctx) : false });
  for (const token of rules.tables ?? []) chips.push({ kind: "tables", token, ok: ctx ? ctx.tables.has(token.toLowerCase()) : false });
  return { chips, pass: chips.every((c) => c.ok), parsed: !!ctx };
}
