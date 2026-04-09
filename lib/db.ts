import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
let initialized = false;

function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

export async function ensureTables() {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS recurring_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      color TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scheduling_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      times_per_week INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      preferred_time_range TEXT,
      color TEXT
    )
  `;
  initialized = true;
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getSql()(strings, ...values);
}
