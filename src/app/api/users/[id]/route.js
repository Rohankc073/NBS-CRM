import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";

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
