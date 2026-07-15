import { queryOne } from "@/server/db";
import argon2 from "argon2";

export async function POST(request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 10) {
    return Response.json(
      { error: "Password must be at least 10 characters" },
      { status: 400 },
    );
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // The guard. This INSERT only fires if the users table is EMPTY —
  // the check and the write are ONE statement, so two simultaneous
  // requests can't both slip through. Postgres decides, not our code.
  const user = await queryOne(
    `INSERT INTO users (name, email, role, password_hash)
     SELECT $1, $2, 'super_admin', $3
     WHERE NOT EXISTS (SELECT 1 FROM users)
     RETURNING id, name, email, role`,
    [name, email, hash],
  );

  // Nothing came back = a user already existed = setup is closed.
  if (!user) {
    return Response.json(
      { error: "Setup has already been completed" },
      { status: 403 },
    );
  }

  return Response.json({ user });
}

// Lets the setup PAGE ask "am I still allowed to exist?"
export async function GET() {
  const row = await queryOne("SELECT COUNT(*)::int AS count FROM users");
  return Response.json({ needsSetup: row.count === 0 });
}
