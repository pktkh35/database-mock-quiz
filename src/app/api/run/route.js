import { DATASETS } from "@/lib/engine/db.js";
import { runMeta } from "@/lib/engine/meta.js";
import { MysqlError } from "@/lib/engine/parse.js";
import { runQuery } from "@/lib/engine/run.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { message: "bad request" } }, { status: 400 });
  }
  const { dataset, sql, playground } = body ?? {};
  if (!DATASETS.includes(dataset) || typeof sql !== "string" || sql.length > 5000) {
    return Response.json({ error: { message: "bad request" } }, { status: 400 });
  }
  try {
    if (playground) {
      const meta = await runMeta(dataset, sql);
      if (meta?.notFound) throw new MysqlError(1146, "42S02", `Table '${dataset}.${meta.notFound}' doesn't exist`);
      if (meta) return Response.json(meta);
    }
    return Response.json(await runQuery(dataset, sql));
  } catch (e) {
    if (e instanceof MysqlError) {
      return Response.json({ error: { code: e.code, state: e.state, message: e.message, line: e.line, full: e.full } });
    }
    console.error(e);
    return Response.json({ error: { message: "Internal error" } }, { status: 500 });
  }
}
