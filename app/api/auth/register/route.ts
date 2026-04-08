import { sql, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email?.trim() || !password?.trim()) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  await ensureTables();

  const existing = await sql`SELECT id FROM users WHERE email = ${email.trim().toLowerCase()}`;
  if (existing.length > 0) {
    return Response.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO users (id, email, password_hash)
    VALUES (${id}, ${email.trim().toLowerCase()}, ${passwordHash})
  `;

  await createSession(id, email.trim().toLowerCase());

  return Response.json({ ok: true });
}
