import { getDb } from "@/lib/db";

interface RecurringRow {
  id: string;
  title: string;
  days_of_week: string;
  start_time: string;
  end_time: string;
  color: string | null;
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM recurring_events").all() as RecurringRow[];
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
  const { id, title, daysOfWeek, startTime, endTime, color } = await request.json();
  const db = getDb();
  db.prepare(
    "INSERT INTO recurring_events (id, title, days_of_week, start_time, end_time, color) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, title, JSON.stringify(daysOfWeek), startTime, endTime, color ?? null);
  return Response.json({ ok: true });
}
