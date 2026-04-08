import { sql, ensureTables } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email?.trim() || !password?.trim()) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  await ensureTables();

  const rows = await sql`
    SELECT id, email, password_hash FROM users WHERE email = ${email.trim().toLowerCase()}
  `;

  if (rows.length === 0) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id, user.email);

  return Response.json({ ok: true });
}
