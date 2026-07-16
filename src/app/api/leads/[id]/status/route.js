import { getCurrentUser } from "@/server/auth/session";
import { queryOne, transaction } from "@/server/db";

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

  const { status_id, note, next_follow_up_at } = body;
  if (!status_id) return Response.json({ error: "Status is required" }, { status: 400 });

  const lead = await queryOne(
    `SELECT id, status_id, assigned_to FROM leads WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && lead.assigned_to !== me.id) {
    return Response.json({ error: "This lead isn't assigned to you" }, { status: 403 });
  }

  const status = await queryOne(`SELECT id, name FROM lead_statuses WHERE id = $1`, [status_id]);
  if (!status) return Response.json({ error: "Invalid status" }, { status: 400 });

  // Empty date string -> null (keeps the column clean).
  const followUp = next_follow_up_at && next_follow_up_at !== "" ? next_follow_up_at : null;

  const result = await transaction(async (client) => {
    const updated = await client.query(
      `UPDATE leads
         SET status_id = $1,
             last_contacted_at = NOW(),
             next_follow_up_at = $2
       WHERE id = $3
       RETURNING id`,
      [status_id, followUp, id],
    );

    await client.query(
      `INSERT INTO lead_stage_history (lead_id, from_status_id, to_status_id, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, lead.status_id, status_id, me.id, note || null],
    );

    return updated.rows[0];
  });

  return Response.json({ ok: true, lead: result, status_name: status.name });
}