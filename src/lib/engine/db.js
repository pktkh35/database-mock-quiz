import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

export const DATASETS = ["hr", "food", "sales", "shop", "university", "library", "classic"];

let ready = null;

function register(db) {
  const fn = (name, f, deterministic = true) =>
    db.create_function(name, f, { deterministic });
  const s = (v) => (v === null || v === undefined ? null : String(v));
  const date = (v) => {
    if (v === null || v === undefined) return null;
    const d = new Date(String(v).slice(0, 10) + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? null : d;
  };

  fn("CONCAT", (...a) => (a.some((x) => x === null) ? null : a.map(String).join("")));
  fn("CONCAT_WS", (sep, ...a) =>
    sep === null ? null : a.filter((x) => x !== null).map(String).join(String(sep))
  );
  fn("LEFT", (v, n) => (v === null ? null : String(v).slice(0, Math.max(0, n))));
  fn("RIGHT", (v, n) => (v === null ? null : n <= 0 ? "" : String(v).slice(-n)));
  fn("LOCATE", (sub, v, pos = 1) =>
    sub === null || v === null
      ? null
      : String(v).toLowerCase().indexOf(String(sub).toLowerCase(), pos - 1) + 1
  );
  fn("IF", (c, a, b) => (c !== null && c !== 0 && c !== "0" ? a : b));
  fn("IFNULL", (a, b) => (a === null ? b : a));
  fn("YEAR", (v) => date(v)?.getUTCFullYear() ?? null);
  fn("MONTH", (v) => (date(v) ? date(v).getUTCMonth() + 1 : null));
  fn("DAY", (v) => date(v)?.getUTCDate() ?? null);
  fn("DATEDIFF", (a, b) => {
    const x = date(a), y = date(b);
    return x && y ? Math.round((x - y) / 86400000) : null;
  });
  fn("DATE_FORMAT", (v, f) => {
    const d = date(v);
    if (!d || f === null) return null;
    const p = (n) => String(n).padStart(2, "0");
    const map = {
      Y: d.getUTCFullYear(), y: p(d.getUTCFullYear() % 100), m: p(d.getUTCMonth() + 1),
      c: d.getUTCMonth() + 1, d: p(d.getUTCDate()), e: d.getUTCDate(),
      H: "00", i: "00", s: "00", "%": "%",
      M: d.toLocaleString("en", { month: "long", timeZone: "UTC" }),
      b: d.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      W: d.toLocaleString("en", { weekday: "long", timeZone: "UTC" }),
      a: d.toLocaleString("en", { weekday: "short", timeZone: "UTC" }),
    };
    return String(f).replace(/%(.)/g, (_, c) => (c in map ? String(map[c]) : c));
  });
  fn("NOW", () => new Date().toISOString().slice(0, 19).replace("T", " "), false);
  fn("CURDATE", () => new Date().toISOString().slice(0, 10), false);
  fn("TRUNCATE", (v, d) => {
    if (v === null || d === null) return null;
    const f = 10 ** d;
    return Math.trunc(v * f) / f;
  });
  fn("__div", (a, b) => (a === null || b === null || b === 0 ? null : Math.trunc(a / b)));
  void s;
}

async function init() {
  const root = process.cwd();
  const wasmBinary = fs.readFileSync(
    path.join(root, "node_modules/sql.js/dist/sql-wasm.wasm")
  );
  const SQL = await initSqlJs({ wasmBinary });
  const dbs = {};
  const schema = {};
  for (const name of DATASETS) {
    const script = fs.readFileSync(path.join(root, "src/data/datasets", `${name}.sql`), "utf8");
    const db = new SQL.Database();
    db.run(script);
    register(db);
    dbs[name] = db;
    schema[name] = readSchema(db);
  }
  return { dbs, schema };
}

function readSchema(db) {
  const tables = {};
  const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid");
  for (const [name] of res[0]?.values ?? []) {
    const info = db.exec(`PRAGMA table_info(${name})`)[0];
    tables[name] = info.values.map(([, col, type, , , pk]) => {
      const m = /DECIMAL\(\d+,\s*(\d+)\)/i.exec(type);
      return { name: col, type: type.replace(/\s+COLLATE.*/i, ""), pk: !!pk, scale: m ? Number(m[1]) : null };
    });
  }
  return tables;
}

export function getEngine() {
  if (!ready) ready = init();
  return ready;
}
