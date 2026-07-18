import { getCurrentUser } from "@/server/auth/session";
import { query } from "@/server/db";

// Bulk-assign contacts to an agent (managers only).
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (me.role !== "super_admin" && me.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { ids, agent_id } = body;
  if (!Array.isArray(ids) || ids.length === 0 || !agent_id) {
    return Response.json(
      { error: "Select contacts and an agent" },
      { status: 400 },
    );
  }

  await query(
    `UPDATE cold_contacts SET assigned_to = $1 WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL`,
    [agent_id, ids],
  );

  return Response.json({ ok: true, assigned: ids.length });
}
