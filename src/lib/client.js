// Small client helpers.
const schemaCache = new Map();

export async function fetchSchema(dataset) {
  if (schemaCache.has(dataset)) return schemaCache.get(dataset);
  const res = await fetch(`/api/schema?dataset=${dataset}`);
  const { tables } = await res.json();
  schemaCache.set(dataset, tables);
  return tables;
}

export async function runSql(dataset, sql, playground = false) {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataset, sql, playground }),
  });
  return res.json();
}

/** Count top-level statements, ignoring strings and comments. */
export function countStatements(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === "-" && n === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
    } else if (c === "#") {
      while (i < sql.length && sql[i] !== "\n") i++;
    } else if (c === "/" && n === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
    } else if (c === "'" || c === '"' || c === "`") {
      i++;
      while (i < sql.length && sql[i] !== c) i += sql[i] === "\\" ? 2 : 1;
      i++;
      out += "x";
    } else {
      out += c;
      i++;
    }
  }
  return out.split(";").filter((s) => s.trim()).length;
}

export function formatCell(v, scale) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && scale !== null && scale !== undefined) return v.toFixed(scale);
  return String(v);
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
