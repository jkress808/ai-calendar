import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTables();

  const { id } = await params;
  await sql`DELETE FROM scheduling_preferences WHERE id = ${id} AND user_id = ${session.userId}`;
  return Response.json({ ok: true });
}
