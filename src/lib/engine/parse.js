import sqlParser from "node-sql-parser";
const { Parser } = sqlParser;

const parser = new Parser();
const OPT = { database: "mysql" };

export class MysqlError extends Error {
  constructor(code, state, message, line) {
    super(message);
    this.code = code;
    this.state = state;
    this.line = line ?? null;
  }
  get full() {
    return `ERROR ${this.code} (${this.state}): ${this.message}`;
  }
}

const astCache = new Map();

/** Parse MySQL SQL -> single SELECT AST. Throws MysqlError. */
export function parseSelect(sql) {
  const key = sql.trim();
  const hit = astCache.get(key);
  if (hit) return hit;

  // node-sql-parser (MySQL mode) has no NATURAL JOIN: mark the table, resolve columns later.
  const stripped = key
    .replace(/;\s*$/, "")
    .replace(/\bNATURAL\s+((?:LEFT|RIGHT)\s+(?:OUTER\s+)?)?JOIN\s+(?=\w)/gi, (_, side) => `${side ?? ""}JOIN __nat__`);
  let ast;
  try {
    ast = parser.astify(stripped, OPT);
  } catch (e) {
    const loc = e.location?.start;
    const line = loc?.line ?? 1;
    const near = loc ? stripped.slice(loc.offset, loc.offset + 40).split("\n")[0] : "";
    throw new MysqlError(
      1064,
      "42000",
      `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${near}' at line ${line}`,
      line
    );
  }
  const list = Array.isArray(ast) ? ast : [ast];
  if (list.length !== 1) {
    throw new MysqlError(1064, "42000", "รันได้ครั้งละ 1 คำสั่ง กรุณาเหลือคำสั่งเดียว", 1);
  }
  const root = list[0];
  walk(root, (n) => {
    if (typeof n.table === "string" && n.table.startsWith("__nat__")) {
      n.table = n.table.slice(7);
      n.natural = true;
    }
  });
  if (root.type !== "select") {
    throw new MysqlError(1064, "42000", "รับเฉพาะคำสั่ง SELECT เท่านั้น", 1);
  }
  if (containsMysql8Only(root)) {
    throw new MysqlError(
      1064,
      "42000",
      "You have an error in your SQL syntax; WITH / window function (OVER) / LATERAL ไม่รองรับใน MySQL 5.7",
      1
    );
  }
  astCache.set(key, root);
  if (astCache.size > 500) astCache.delete(astCache.keys().next().value);
  return root;
}

function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, fn);
    return;
  }
  if (fn(node) === false) return;
  for (const k of Object.keys(node)) {
    if (k === "tableList" || k === "columnList") continue;
    walk(node[k], fn);
  }
}

export { walk };

function containsMysql8Only(root) {
  let bad = false;
  walk(root, (n) => {
    if (n.with) bad = true;
    if (n.over) bad = true;
    if (n.type === "window" || n.window) bad = true;
    if (n.lateral) bad = true;
    return !bad;
  });
  return bad;
}

/** Convert MySQL AST -> SQLite SQL (mutates a deep copy). */
/** Rewrite NATURAL joins to USING(common columns), using the dataset schema. */
function resolveNatural(sel, tables) {
  if (!sel || !Array.isArray(sel.from)) return;
  const colsOf = (t) => (tables[Object.keys(tables).find((k) => k.toLowerCase() === String(t).toLowerCase())] ?? []).map((c) => c.name.toLowerCase());
  const seen = new Set();
  for (const f of sel.from) {
    if (typeof f.table === "string") {
      if (f.natural) {
        const mine = colsOf(f.table);
        const common = mine.filter((c) => seen.has(c));
        if (common.length) f.using = common.map((value) => ({ type: "default", value }));
        else f.join = "CROSS JOIN";
        delete f.natural;
      }
      colsOf(f.table).forEach((c) => seen.add(c));
    }
  }
}

function anyAll(n) {
  const r = n.right;
  const name = r?.type === "function" ? r.name?.name?.[0]?.value?.toUpperCase() : null;
  if (!["ANY", "ALL", "SOME"].includes(name) || !r.args?.value?.[0]?.ast) return;
  const all = name === "ALL";
  const op = n.operator;
  if ((op === "=" && !all) || (op === "<>" && all) || (op === "!=" && all)) {
    n.operator = all ? "NOT IN" : "IN";
    n.right = r.args;
    return;
  }
  const small = op === ">" || op === ">=";
  if (!["<", "<=", ">", ">="].includes(op)) return;
  const agg = all === small ? "MAX" : "MIN";
  const sub = r.args.value[0];
  const col = sub.ast.columns?.[0];
  if (!col) return;
  col.as = "__c";
  const tpl = parser.astify(`SELECT 1 WHERE x > (SELECT ${agg}(__c) FROM (SELECT 1 AS __c) __t)`, OPT);
  const scalar = tpl.where.right;
  scalar.ast.from[0].expr = { ...sub, parentheses: true };
  n.right = scalar;
}

export function toSqlite(root, tables = {}) {
  const copy = JSON.parse(JSON.stringify(root));
  walk(copy, (n) => {
    if (n.type === "select") resolveNatural(n, tables);
    if (n.type === "binary_expr") anyAll(n);
    if (n.type === "binary_expr" && /LIKE$/.test(String(n.operator)) && n.right?.type === "single_quote_string" && !n.right.escape && n.right.value.includes("\\")) {
      n.right.escape = { type: "ESCAPE", value: { type: "single_quote_string", value: "\\" } };
    }
  });
  walk(copy, (n) => {
    if (n.type === "binary_expr") {
      if (n.operator === "/") {
        n.left = { type: "binary_expr", operator: "*", left: n.left, right: { type: "number", value: 1.0 } };
        n.__float = true;
      } else if (n.operator === "DIV") {
        n.type = "function";
        n.name = { name: [{ type: "default", value: "__div" }] };
        n.args = { type: "expr_list", value: [n.left, n.right] };
        delete n.operator;
        delete n.left;
        delete n.right;
      } else if (n.operator === "||") {
        n.operator = "OR";
      }
    }
  });
  let sql = parser.sqlify(copy, { database: "sqlite" });
  // 1.0 literal printed as "1" by sqlify; force float multiply.
  sql = sql.replace(/\* 1(?=\s*\/)/g, "* 1.0");
  return sql;
}

export function tableNames(root) {
  const out = new Set();
  walk(root, (n) => {
    if (typeof n.table === "string" && n.table && n.join !== undefined) out.add(n.table.toLowerCase());
    else if (typeof n.table === "string" && n.table && n.db === null && n.as !== undefined && !n.expr) out.add(n.table.toLowerCase());
  });
  return out;
}

export { parser, OPT };
