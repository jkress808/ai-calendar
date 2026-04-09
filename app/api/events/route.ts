import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json([], { status: 401 });

  await ensureTables();

  const rows = await sql`
    SELECT id, title, start_time AS start, end_time AS "end", color
    FROM events WHERE user_id = ${session.userId}
  `;
  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, title, start, end, color } = body;

  if (!id || typeof id !== "string") {
    return Response.json({ error: "Missing or invalid 'id'" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Missing or invalid 'title'" }, { status: 400 });
  }
  if (!start || typeof start !== "string") {
    return Response.json({ error: "Missing or invalid 'start' time" }, { status: 400 });
  }
  if (!end || typeof end !== "string") {
    return Response.json({ error: "Missing or invalid 'end' time" }, { status: 400 });
  }

  await ensureTables();

  await sql`
    INSERT INTO events (id, user_id, title, start_time, end_time, color)
    VALUES (${id}, ${session.userId}, ${title}, ${start}, ${end}, ${color ?? null})
  `;
  return Response.json({ ok: true });
}
