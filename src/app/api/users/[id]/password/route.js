import argon2 from "argon2";
import { z } from "zod";
import { query, queryOne } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers } from "@/server/authz/policy";
import { passwordSchema } from "@/lib/validators/user";

const schema = z.object({ password: passwordSchema });

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canManageUsers(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const target = await queryOne(
    `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  const hash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });

  // Set the new password, flag it as temporary, and bump token_version —
  // which instantly invalidates every access token the user is holding.
  // They're logged out everywhere the moment their password is reset.
  await query(
    `UPDATE users
       SET password_hash = $1,
           must_change_password = TRUE,
           token_version = token_version + 1
     WHERE id = $2`,
    [hash, id],
  );

  // Kill their active sessions too, so the old refresh token can't renew.
  await query(`DELETE FROM sessions WHERE user_id = $1`, [id]);

  return Response.json({ ok: true });
}