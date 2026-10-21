import { getEngine } from "./db.js";
import { MysqlError, OPT, parseSelect, parser, toSqlite, walk } from "./parse.js";

export const ROW_LIMIT = 200;
const cache = new Map();

function mapSqliteError(msg, dataset) {
  let m;
  if ((m = /no such table: (\S+)/.exec(msg)))
    return new MysqlError(1146, "42S02", `Table '${dataset}.${m[1]}' doesn't exist`);
  if ((m = /no such column: (\S+)/.exec(msg)))
    return new MysqlError(1054, "42S22", `Unknown column '${m[1]}' in 'field list'`);
  if ((m = /ambiguous column name: (\S+)/.exec(msg)))
    return new MysqlError(1052, "23000", `Column '${m[1].split(".").pop()}' in field list is ambiguous`);
  if (/misuse of aggregate|aggregate functions are not allowed/i.test(msg))
    return new MysqlError(1111, "HY000", "Invalid use of group function");
  if ((m = /no such function: (\S+)/.exec(msg)))
    return new MysqlError(1305, "42000", `FUNCTION ${dataset}.${m[1]} does not exist`);
  return new MysqlError(
    1064,
    "42000",
    `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '' at line 1`
  );
}

/** SQLite treats unknown "x" as a string literal, so verify columns ourselves. */
function checkColumns(root, schema, dataset) {
  const tables = schema[dataset];
  const allCols = new Set();
  for (const cols of Object.values(tables)) for (const c of cols) allCols.add(c.name.toLowerCase());
  const aliasToTable = new Map();
  const derived = new Set();
  const outAliases = new Set();
  walk(root, (n) => {
    if (typeof n.as === "string" && n.as) {
      if (n.expr && n.expr.ast) derived.add(n.as.toLowerCase());
      else if (typeof n.table === "string") aliasToTable.set(n.as.toLowerCase(), n.table.toLowerCase());
      else outAliases.add(n.as.toLowerCase());
    } else if (n.as && typeof n.as === "object") {
      // derived table alias may be object
    }
    if (n.expr && n.expr.ast && typeof n.as === "string") derived.add(n.as.toLowerCase());
    if (typeof n.table === "string" && !n.type) aliasToTable.set(n.table.toLowerCase(), n.table.toLowerCase());
  });
  let error = null;
  const tableKeys0 = new Set(Object.keys(tables).map((t) => t.toLowerCase()));
  walk(root, (n) => {
    if (!error && typeof n.table === "string" && !n.type && !tableKeys0.has(n.table.toLowerCase()))
      error = new MysqlError(1146, "42S02", `Table '${dataset}.${n.table}' doesn't exist`);
  });
  if (error) throw error;
  const tableKeys = Object.fromEntries(Object.entries(tables).map(([t, c]) => [t.toLowerCase(), c]));
  walk(root, (n) => {
    if (error) return false;
    if (n.type !== "column_ref" || typeof n.column !== "string" || n.column === "*") return;
    const col = n.column.toLowerCase();
    if (n.table) {
      const q = String(n.table).toLowerCase();
      if (derived.has(q)) return;
      const real = aliasToTable.get(q);
      if (!real) {
        error = new MysqlError(1051, "42S02", `Unknown table '${n.table}'`);
      } else if (tableKeys[real] && !tableKeys[real].some((c) => c.name.toLowerCase() === col)) {
        error = new MysqlError(1054, "42S22", `Unknown column '${n.table}.${n.column}' in 'field list'`);
      }
    } else if (!allCols.has(col) && !outAliases.has(col) && !derived.has(col)) {
      error = new MysqlError(1054, "42S22", `Unknown column '${n.column}' in 'field list'`);
    }
  });
  if (error) throw error;
}

function decimalScales(root, schema, dataset) {
  const scaleByCol = {};
  for (const cols of Object.values(schema[dataset])) for (const c of cols) if (c.scale !== null) scaleByCol[c.name.toLowerCase()] = c.scale;
  return (names) => {
    const direct = {};
    if (Array.isArray(root.columns)) {
      for (const c of root.columns) {
        if (c.expr?.type === "column_ref") direct[(c.as || c.expr.column).toLowerCase()] = scaleByCol[c.expr.column.toLowerCase()] ?? null;
      }
    }
    return names.map((n) => {
      const k = n.toLowerCase();
      if (k in direct) return direct[k];
      return Array.isArray(root.columns) ? null : (scaleByCol[k] ?? null);
    });
  };
}

function displayNames(root, fallback) {
  if (!Array.isArray(root.columns) || root.columns.length !== fallback.length) return fallback;
  if (root.columns.some((c) => c.expr?.column === "*")) return fallback;
  return root.columns.map((c, i) => {
    if (typeof c.as === "string" && c.as) return c.as;
    if (c.expr?.type === "column_ref" && c.expr.column !== "*") return c.expr.column;
    try {
      const one = { ...root, columns: [c], from: null, where: null, groupby: null, having: null, orderby: null, limit: null };
      return parser.sqlify(one, OPT).replace(/^SELECT\s+/i, "").replace(/`/g, "").replace(/\s+(ASC)$/i, "");
    } catch {
      return fallback[i];
    }
  });
}


const DDL_RE = /^\s*(drop|set)\b/i;

/** Emulates MySQL DROP TABLE / SET FOREIGN_KEY_CHECKS on a throwaway copy of the dataset. Result = tables left. */
async function runDdl(dataset, sql) {
  const t0 = performance.now();
  const { SQL, scripts } = await getEngine();
  const db = new SQL.Database();
  try {
    db.run(scripts[dataset]);
    const tables = () => db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]?.values.map((r) => r[0]) ?? [];
    const fkRefs = (parent) => {
      const out = [];
      for (const t of tables()) {
        if (t.toLowerCase() === parent.toLowerCase()) continue;
        db.exec(`PRAGMA foreign_key_list(${t})`)[0]?.values.forEach((r, i) => {
          if (String(r[2]).toLowerCase() === parent.toLowerCase()) out.push({ table: t, name: `${t}_ibfk_${i + 1}` });
        });
      }
      return out;
    };
    let fkChecks = true;
    for (const stmt of sql.split(";").map((x) => x.trim()).filter(Boolean)) {
      let m;
      if ((m = /^set\s+(?:@@(?:session\.)?)?foreign_key_checks\s*=\s*([01]|on|off|true|false)$/i.exec(stmt))) {
        fkChecks = /^(1|on|true)$/i.test(m[1]);
      } else if ((m = /^drop\s+table\s+(if\s+exists\s+)?(.+)$/i.exec(stmt))) {
        const names = m[2].split(",").map((x) => x.trim().replace(/^`|`$/g, "").replace(new RegExp(`^${dataset}\\.`, "i"), "").replace(/^`|`$/g, ""));
        const have = new Set(tables().map((t) => t.toLowerCase()));
        const missing = names.filter((n) => !have.has(n.toLowerCase()));
        if (missing.length && !m[1]) throw new MysqlError(1051, "42S02", `Unknown table '${missing.map((n) => `${dataset}.${n}`).join(",")}'`);
        const dropping = new Set(names.map((n) => n.toLowerCase()));
        for (const n of names) {
          if (!have.has(n.toLowerCase())) continue;
          const ref = fkChecks ? fkRefs(n).find((r) => !dropping.has(r.table.toLowerCase())) : null;
          if (ref) throw new MysqlError(3730, "HY000", `Cannot drop table '${n}' referenced by a foreign key constraint '${ref.name}' on table '${ref.table}'.`);
        }
        for (const n of names) if (have.has(n.toLowerCase())) db.run(`DROP TABLE ${n}`);
      } else {
        throw new MysqlError(1064, "42000", `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${stmt.slice(0, 20)}' at line 1`);
      }
    }
    const rows = tables().map((t) => [t]);
    return { columns: [`Tables_in_${dataset}`], rows, scales: [null], truncated: false, ms: Math.round((performance.now() - t0) * 10) / 10 };
  } finally {
    db.close();
  }
}

/** Run one MySQL-flavoured SELECT. Returns {columns, rows, scales, truncated, ms} or throws MysqlError. */
export async function runQuery(dataset, sql, { limit = ROW_LIMIT } = {}) {
  const { dbs, schema } = await getEngine();
  const db = dbs[dataset];
  if (!db) throw new MysqlError(1049, "42000", `Unknown database '${dataset}'`);
  const key = `${dataset}\u0000${sql.trim().replace(/\s+/g, " ")}\u0000${limit}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, ms: 0, cached: true };

  const t0 = performance.now();
  if (DDL_RE.test(sql)) return runDdl(dataset, sql);
  const root = parseSelect(sql);
  walk(root, (n) => {
    if (n.db && String(n.db).toLowerCase() === dataset) n.db = null;
  });
  checkColumns(root, schema, dataset);
  const lite = toSqlite(root, schema[dataset]);

  const stmt = (() => {
    try {
      return db.prepare(lite);
    } catch (e) {
      throw mapSqliteError(String(e.message), dataset);
    }
  })();
  const columns = displayNames(root, stmt.getColumnNames());
  const rows = [];
  let truncated = false;
  try {
    while (stmt.step()) {
      if (rows.length >= limit) {
        truncated = true;
        break;
      }
      rows.push(stmt.get());
    }
  } catch (e) {
    throw mapSqliteError(String(e.message), dataset);
  } finally {
    stmt.free();
  }
  const scales = decimalScales(root, schema, dataset)(columns);
  const result = { columns, rows, scales, truncated, ms: Math.round((performance.now() - t0) * 10) / 10 };
  cache.set(key, result);
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return result;
}

export async function getSchema(dataset) {
  const { schema } = await getEngine();
  return schema[dataset];
}
