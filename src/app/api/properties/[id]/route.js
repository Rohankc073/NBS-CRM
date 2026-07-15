import { getCurrentUser } from "@/server/auth/session";
import { canApproveProperty } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import { z } from "zod";

// ── Fetch one property + its media ──────────────────────────────────
export async function GET(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;

  const property = await queryOne(
    `SELECT p.*, t.name AS type_name,
            u.name AS created_by_name, a.name AS agent_name
     FROM properties p
     LEFT JOIN property_types t ON t.id = p.type_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN users a ON a.id = p.assigned_agent_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  );
  if (!property) return Response.json({ error: "Not found" }, { status: 404 });

  const isReviewer = me.role === "super_admin" || me.role === "admin";
  if (!isReviewer && property.approval_status !== "approved" && property.created_by !== me.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const media = await query(
    `SELECT id, kind, file_path, original_name FROM property_media
     WHERE property_id = $1 ORDER BY kind, sort_order`,
    [id],
  );

  return Response.json({ property, media });
}

// ── Edit a property (Admin / Super Admin only) ──────────────────────
const emptyToNull = (v) => (v === "" || v === undefined ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().nullable());
const int = z.preprocess(emptyToNull, z.coerce.number().int().nullable());
const str = z.preprocess(emptyToNull, z.string().max(2000).nullable());

const editSchema = z.object({
  name: z.string().trim().min(2).max(200),
  project_name: str,
  developer: str,
  type_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  description: str,
  bedrooms: int,
  bathrooms: int,
  built_up_area: num,
  plot_size: num,
  price: num,
  community: str,
  exact_location: str,
  google_maps_url: str,
  amenities: z.array(z.string()).optional().default([]),
  availability: z.enum(["available", "reserved", "sold", "rented", "off_market"]),
  completion_date: z.preprocess(emptyToNull, z.string().nullable()),
  assigned_agent_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  owner_name: str,
  owner_phone: str,
  owner_email: str,
});

export async function PUT(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const p = parsed.data;

  const updated = await queryOne(
    `UPDATE properties SET
       name=$1, project_name=$2, developer=$3, type_id=$4, description=$5,
       bedrooms=$6, bathrooms=$7, built_up_area=$8, plot_size=$9, price=$10,
       community=$11, exact_location=$12, google_maps_url=$13, amenities=$14,
       availability=$15, completion_date=$16, assigned_agent_id=$17,
       owner_name=$18, owner_phone=$19, owner_email=$20
     WHERE id=$21 AND deleted_at IS NULL
     RETURNING id`,
    [
      p.name, p.project_name, p.developer, p.type_id, p.description,
      p.bedrooms, p.bathrooms, p.built_up_area, p.plot_size, p.price,
      p.community, p.exact_location, p.google_maps_url, JSON.stringify(p.amenities),
      p.availability, p.completion_date, p.assigned_agent_id,
      p.owner_name, p.owner_phone, p.owner_email, id,
    ],
  );
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ property: updated });
}

// ── Approve or reject a pending property ────────────────────────────
export async function PATCH(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "approve" && action !== "reject") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const target = await queryOne(
    `SELECT id FROM properties WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!target) return Response.json({ error: "Property not found" }, { status: 404 });

  const updated = await queryOne(
    `UPDATE properties
       SET approval_status = $1,
           approved_by = $2,
           approved_at = NOW(),
           rejection_reason = $3
     WHERE id = $4
     RETURNING id, approval_status`,
    [
      action === "approve" ? "approved" : "rejected",
      me.id,
      action === "reject" ? (reason || "No reason given") : null,
      id,
    ],
  );

  return Response.json({ property: updated });
}

// ── Soft-delete a property ──────────────────────────────────────────
export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await query(`UPDATE properties SET deleted_at = NOW() WHERE id = $1`, [id]);
  return Response.json({ ok: true });
}