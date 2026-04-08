import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title, start, end, color } = await req.json();

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
