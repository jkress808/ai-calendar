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

  const body = await request.json();
  const { id, title, daysOfWeek, startTime, endTime, color } = body;

  if (!id || typeof id !== "string") {
    return Response.json({ error: "Missing or invalid 'id'" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "Missing or invalid 'title'" }, { status: 400 });
  }
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || !daysOfWeek.every((d: unknown) => typeof d === "number" && d >= 0 && d <= 6)) {
    return Response.json({ error: "Missing or invalid 'daysOfWeek' (array of 0-6)" }, { status: 400 });
  }
  if (!startTime || typeof startTime !== "string" || !/^\d{2}:\d{2}$/.test(startTime)) {
    return Response.json({ error: "Missing or invalid 'startTime' (HH:mm)" }, { status: 400 });
  }
  if (!endTime || typeof endTime !== "string" || !/^\d{2}:\d{2}$/.test(endTime)) {
    return Response.json({ error: "Missing or invalid 'endTime' (HH:mm)" }, { status: 400 });
  }

  await ensureTables();

  await sql`
    INSERT INTO recurring_events (id, user_id, title, days_of_week, start_time, end_time, color)
    VALUES (${id}, ${session.userId}, ${title}, ${JSON.stringify(daysOfWeek)}, ${startTime}, ${endTime}, ${color ?? null})
  `;
  return Response.json({ ok: true });
}
