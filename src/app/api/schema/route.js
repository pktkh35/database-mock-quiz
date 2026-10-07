import { DATASETS } from "@/lib/engine/db.js";
import { getSchema } from "@/lib/engine/run.js";

export const runtime = "nodejs";

export async function GET(request) {
  const dataset = request.nextUrl.searchParams.get("dataset");
  if (!DATASETS.includes(dataset)) return Response.json({ error: "bad request" }, { status: 400 });
  return Response.json({ tables: await getSchema(dataset) });
}
