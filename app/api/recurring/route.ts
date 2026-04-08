import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json([], { status: 401 });

  await ensureTables();

  const rows = await sql`
    SELECT id, title, days_of_week, start_time, end_time, color
    FROM recurring_events WHERE user_id = ${session.userId}
  `;
  const events = rows.map((r) => ({
    id: r.id,
    title: r.title,
    daysOfWeek: JSON.parse(r.days_of_week),
    startTime: r.start_time,
    endTime: r.end_time,
    color: r.color ?? undefined,
  }));
  return Response.json(events);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, daysOfWeek, startTime, endTime, color } = await request.json();

  await ensureTables();

  await sql`
    INSERT INTO recurring_events (id, user_id, title, days_of_week, start_time, end_time, color)
    VALUES (${id}, ${session.userId}, ${title}, ${JSON.stringify(daysOfWeek)}, ${startTime}, ${endTime}, ${color ?? null})
  `;
  return Response.json({ ok: true });
}
