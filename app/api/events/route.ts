import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const events = db.prepare("SELECT * FROM events").all();
  return Response.json(events);
}

export async function POST(request: Request) {
  const { id, title, start, end, color } = await request.json();
  const db = getDb();
  db.prepare(
    "INSERT INTO events (id, title, start, end, color) VALUES (?, ?, ?, ?, ?)"
  ).run(id, title, start, end, color ?? null);
  return Response.json({ ok: true });
}
