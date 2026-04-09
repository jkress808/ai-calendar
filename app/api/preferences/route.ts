import { sql, ensureTables } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json([], { status: 401 });

  await ensureTables();

  const rows = await sql`
    SELECT id, title, times_per_week, duration_minutes, preferred_time_range, color
    FROM scheduling_preferences WHERE user_id = ${session.userId}
  `;
  const prefs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    timesPerWeek: r.times_per_week,
    durationMinutes: r.duration_minutes,
    preferredTimeRange: r.preferred_time_range ?? "any",
    color: r.color ?? undefined,
  }));
  return Response.json(prefs);
}
