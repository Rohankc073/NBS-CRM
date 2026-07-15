import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers, ROLES } from "@/server/authz/policy";
import { emailSchema } from "@/lib/validators/user";
import { query, queryOne } from "@/server/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: emailSchema,
  role: z.enum(ROLES, { message: "Choose a valid role" }),
  is_active: z.boolean(),
});

export async function PATCH(request, { params }) {
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { name, email, role, is_active } = parsed.data;

  const target = await queryOne(
    `SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!target)
    return Response.json({ error: "User not found" }, { status: 404 });

  // Don't demote or deactivate the last active Super Admin — same lockout
  // risk as deleting one.
  const losingSuperAdmin =
    target.role === "super_admin" && (role !== "super_admin" || !is_active);

  if (losingSuperAdmin) {
    const row = await queryOne(
      `SELECT COUNT(*)::int AS count FROM users
       WHERE role = 'super_admin' AND is_active = TRUE AND deleted_at IS NULL`,
    );
    if (row.count <= 1) {
      return Response.json(
        {
          error:
            "This is the only active Super Admin. Promote someone else first.",
        },
        { status: 400 },
      );
    }
  }

  // Email must be unique among OTHER active users.
  const clash = await queryOne(
    `SELECT id FROM users WHERE email = $1 AND id <> $2 AND deleted_at IS NULL`,
    [email, id],
  );
  if (clash) {
    return Response.json(
      { error: "That email is already in use" },
      { status: 409 },
    );
  }

  // Bump token_version when role changes or the user is deactivated, so any
  // token carrying the old role/status is invalidated immediately. Without
  // this, a demoted admin keeps admin powers until their token expires.
  const roleOrStatusChanged = role !== target.role || is_active === false;

  let updated;
  try {
    updated = await queryOne(
      `UPDATE users
         SET name = $1,
             email = $2,
             role = $3,
             is_active = $4,
             token_version = token_version + $5
       WHERE id = $6
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, role, is_active, roleOrStatusChanged ? 1 : 0, id],
    );
  } catch (err) {
    if (err.code === "23505") {
      return Response.json(
        { error: "That email is already in use" },
        { status: 409 },
      );
    }
    throw err;
  }

  // Deactivated? Kill their sessions so the refresh token can't renew.
  if (!is_active) {
    await query(`DELETE FROM sessions WHERE user_id = $1`, [id]);
  }

  return Response.json({ user: updated });
}

export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canManageUsers(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Locking yourself out of your own CRM is not a recoverable mistake.
  if (id === me.id) {
    return Response.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  const target = await queryOne(
    `SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!target)
    return Response.json({ error: "User not found" }, { status: 404 });

  // Never leave the brokerage with zero Super Admins.
  if (target.role === "super_admin") {
    const row = await queryOne(
      `SELECT COUNT(*)::int AS count FROM users
       WHERE role = 'super_admin' AND deleted_at IS NULL`,
    );
    if (row.count <= 1) {
      return Response.json(
        { error: "This is the only Super Admin. Promote someone else first." },
        { status: 400 },
      );
    }
  }

  // Soft delete. The row stays, so leads and call history keep their owner.
  await query(
    `UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE id = $1`,
    [id],
  );

  // Their login dies right now — not whenever the token happens to expire.
  await query(`DELETE FROM sessions WHERE user_id = $1`, [id]);

  return Response.json({ ok: true });
}