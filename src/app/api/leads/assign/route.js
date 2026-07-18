import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";

// Bulk-assign / reassign leads. Managers only.
// Two selection modes:
//   ids:    an explicit list (page checkboxes)
//   filter: { status, q } - assigns EVERY lead matching the current filter,
//           so "select all 500 matching" doesn't need 500 ids in the request.
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (me.role !== "super_admin" && me.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

  const { ids, filter, agent_id } = body;

  if (!agent_id) return Response.json({ error: "Pick an agent" }, { status: 400 });

  const agent = await queryOne(
    `SELECT id, name FROM users WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [agent_id],
  );
  if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });

  // Mode A: explicit ids from the page checkboxes.
  if (Array.isArray(ids) && ids.length > 0) {
    const res = await query(
      `UPDATE leads SET assigned_to = $1
       WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL
       RETURNING id`,
      [agent_id, ids],
    );
    return Response.json({ ok: true, assigned: res.length, agent: agent.name });
  }

  // Mode B: everything matching the current filter.
  if (filter) {
    const where = ["deleted_at IS NULL"];
    const params = [agent_id];

    if (filter.status && filter.status !== "all") {
      params.push(filter.status);
      where.push(`status_id = $${params.length}`);
    }
    if (filter.q) {
      const asNum = parseInt(String(filter.q).replace("#", ""), 10);
      if (!isNaN(asNum) && String(asNum) === String(filter.q).replace("#", "").trim()) {
        params.push(asNum);
        where.push(`ref_no = $${params.length}`);
      } else {
        params.push(`%${filter.q}%`);
        where.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length})`);
      }
    }

    const res = await query(
      `UPDATE leads SET assigned_to = $1 WHERE ${where.join(" AND ")} RETURNING id`,
      params,
    );
    return Response.json({ ok: true, assigned: res.length, agent: agent.name });
  }

  return Response.json({ error: "Select leads to assign" }, { status: 400 });
}