import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import { normalizePhone } from "@/lib/phone";
import { z } from "zod";

const emptyToNull = (v) => (v === "" || v == null ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().nullable());
const str = z.preprocess(emptyToNull, z.string().max(2000).nullable());

const editSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(5, "Phone is required"),
  alt_phone: str, whatsapp: str, email: str, nationality: str,
  budget_min: num, budget_max: num,
  preferred_type: str, preferred_location: str, bedrooms: str,
  notes: str,
});

// GET one lead with everything the detail page needs.
export async function GET(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const lead = await queryOne(
    `SELECT l.*, s.name AS status_name, src.name AS source_name, u.name AS agent_name
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     LEFT JOIN lead_sources src ON src.id = l.source_id
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE l.id = $1 AND l.deleted_at IS NULL`,
    [id],
  );
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && lead.assigned_to !== me.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({ lead });
}

// PUT edits the lead's info.
export async function PUT(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;

  const lead = await queryOne(
    `SELECT id, assigned_to FROM leads WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && lead.assigned_to !== me.id) {
    return Response.json({ error: "This lead isn't assigned to you" }, { status: 403 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;

  // Re-normalize the phone in case it changed.
  const normalized = normalizePhone(d.phone);
  if (!normalized) return Response.json({ error: "Invalid phone number" }, { status: 400 });

  // Guard against creating a duplicate of another active lead.
  const clash = await queryOne(
    `SELECT id FROM leads WHERE phone_normalized = $1 AND id <> $2 AND deleted_at IS NULL`,
    [normalized, id],
  );
  if (clash) return Response.json({ error: "Another lead already has this phone" }, { status: 409 });

  const updated = await queryOne(
    `UPDATE leads SET
       name=$1, phone=$2, phone_normalized=$3, alt_phone=$4, whatsapp=$5,
       email=$6, nationality=$7, budget_min=$8, budget_max=$9,
       preferred_type=$10, preferred_location=$11, bedrooms=$12, notes=$13
     WHERE id=$14
     RETURNING id`,
    [
      d.name, d.phone, normalized, d.alt_phone, d.whatsapp,
      d.email, d.nationality, d.budget_min, d.budget_max,
      d.preferred_type, d.preferred_location, d.bedrooms, d.notes, id,
    ],
  );

  return Response.json({ lead: updated });
}

// DELETE soft-deletes (managers only).
export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await query(`UPDATE leads SET deleted_at = NOW() WHERE id = $1`, [id]);
  return Response.json({ ok: true });
}