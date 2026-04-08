import Database from "better-sqlite3";
import path from "path";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.join(process.cwd(), "calendar.db"));
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        color TEXT
      );
      CREATE TABLE IF NOT EXISTS recurring_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        color TEXT
      );
    `);
  }
  return db;
}
