import { getCurrentUser } from "@/server/auth/session";
import { queryOne } from "@/server/db";

const CHANNELS = ["call", "whatsapp", "email", "sms", "reveal"];

export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { channel, note } = body;
  if (!CHANNELS.includes(channel))
    return Response.json({ error: "Invalid channel" }, { status: 400 });

  const contact = await queryOne(
    `SELECT id, assigned_to FROM cold_contacts WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && contact.assigned_to !== me.id) {
    return Response.json({ error: "Not assigned to you" }, { status: 403 });
  }

  const row = await queryOne(
    `INSERT INTO contact_activity (contact_id, channel, note, done_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, channel, note, created_at`,
    [id, channel, note || null, me.id],
  );

  return Response.json({
    ok: true,
    activity: { ...row, done_by_name: me.name },
  });
}
