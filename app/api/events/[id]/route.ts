import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

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
