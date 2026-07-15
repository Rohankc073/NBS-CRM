import { createUserSchema } from "@/lib/validators/user";
import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import argon2 from "argon2";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canManageUsers(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );
  return Response.json({ users });
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  // The gate. Everything else is decoration.
  if (!canManageUsers(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  // The body is hostile until proven otherwise. Zod checks types, formats,
  // lengths, and the role enum in one pass — and hands back cleaned data.
  // A raw `await request.json()` could be anything: a number where a string
  // belongs, a 10MB name, an object instead of a password.
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  // Guaranteed: right types, trimmed, email lowercased, role valid.
  const { name, email, password, role } = parsed.data;

  // Friendly pre-check: catches the common case with a clean message
  // BEFORE we spend time hashing a password we'll throw away.
  const existing = await queryOne(
    `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );
  if (existing) {
    return Response.json(
      { error: "That email is already in use" },
      { status: 409 },
    );
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // The database is the final authority. If a race or a soft-deleted-email
  // edge case slips past the check above, the unique index still rejects it —
  // and we turn that into a clean 409 instead of a 500 crash.
  let user;
  try {
    user = await queryOne(
      `INSERT INTO users (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, role, hash],
    );
  } catch (err) {
    if (err.code === "23505") {
      return Response.json(
        { error: "That email is already in use" },
        { status: 409 },
      );
    }
    throw err; // genuinely unexpected — let it surface in logs
  }

  return Response.json({ user }, { status: 201 });
}
