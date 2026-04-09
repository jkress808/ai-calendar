import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, start, end, color } = body;

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return Response.json({ error: "Invalid 'title'" }, { status: 400 });
  }
  if (start !== undefined && typeof start !== "string") {
    return Response.json({ error: "Invalid 'start' time" }, { status: 400 });
  }
  if (end !== undefined && typeof end !== "string") {
    return Response.json({ error: "Invalid 'end' time" }, { status: 400 });
  }

  await ensureTables();

  await sql`
    UPDATE events
    SET title = COALESCE(${title ?? null}, title),
        start_time = COALESCE(${start ?? null}, start_time),
        end_time = COALESCE(${end ?? null}, end_time),
        color = COALESCE(${color ?? null}, color)
    WHERE id = ${id} AND user_id = ${session.userId}
  `;
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await ensureTables();

  await sql`DELETE FROM events WHERE id = ${id} AND user_id = ${session.userId}`;
  return Response.json({ ok: true });
}
