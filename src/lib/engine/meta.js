import { getSchema } from "./run.js";

/** Playground-only MySQL helpers: SHOW TABLES, DESCRIBE t, SHOW COLUMNS FROM t. Returns null if not a meta command. */
export async function runMeta(dataset, sql) {
  const s = sql.trim().replace(/;\s*$/, "").replace(/\s+/g, " ");
  const schema = await getSchema(dataset);
  if (/^show tables$/i.test(s)) {
    return { columns: [`Tables_in_${dataset}`], rows: Object.keys(schema).map((t) => [t]), scales: [null], truncated: false, ms: 0.1 };
  }
  const m = /^(?:describe|desc|show (?:full )?columns (?:from|in)) `?(\w+)`?$/i.exec(s);
  if (m) {
    const key = Object.keys(schema).find((t) => t.toLowerCase() === m[1].toLowerCase());
    if (!key) return { notFound: m[1] };
    const rows = schema[key].map((c) => [c.name, c.type.toLowerCase(), c.pk ? "NO" : "YES", c.pk ? "PRI" : "", null, ""]);
    return { columns: ["Field", "Type", "Null", "Key", "Default", "Extra"], rows, scales: Array(6).fill(null), truncated: false, ms: 0.1 };
  }
  return null;
}
