import { getCurrentUser } from "@/server/auth/session";
import {
  canCreateProperty,
  autoApprovesProperty,
} from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import { z } from "zod";

// Coerce empty strings from the form into null, and strings into numbers,
// so the DB gets clean typed values. A blank "bedrooms" field should be
// NULL, not "".
const emptyToNull = (v) => (v === "" || v === undefined ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().nullable());
const int = z.preprocess(emptyToNull, z.coerce.number().int().nullable());
const str = z.preprocess(emptyToNull, z.string().max(2000).nullable());

const createSchema = z.object({
  name: z.string().trim().min(2, "Property name is required").max(200),
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

  availability: z
    .enum(["available", "reserved", "sold", "rented", "off_market"])
    .default("available"),
  completion_date: z.preprocess(emptyToNull, z.string().nullable()),

  assigned_agent_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  owner_name: str,
  owner_phone: str,
  owner_email: str,
});

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  // Agents see their own (any status) + all approved. Admins see everything.
  // We'll expand filters later; this is the baseline visibility rule.
  const isReviewer =
    me.role === "super_admin" || me.role === "admin";

  const rows = isReviewer
    ? await query(
        `SELECT p.*, t.name AS type_name, u.name AS created_by_name
         FROM properties p
         LEFT JOIN property_types t ON t.id = p.type_id
         LEFT JOIN users u ON u.id = p.created_by
         WHERE p.deleted_at IS NULL
         ORDER BY p.created_at DESC`,
      )
    : await query(
        `SELECT p.*, t.name AS type_name, u.name AS created_by_name
         FROM properties p
         LEFT JOIN property_types t ON t.id = p.type_id
         LEFT JOIN users u ON u.id = p.created_by
         WHERE p.deleted_at IS NULL
           AND (p.approval_status = 'approved' OR p.created_by = $1)
         ORDER BY p.created_at DESC`,
        [me.id],
      );

  return Response.json({ properties: rows });
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  // Telecallers can't create; everyone else can.
  if (!canCreateProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const p = parsed.data;

  // THE approval decision. Admin/Super Admin → live immediately.
  // Agent → pending, invisible to the public list until approved.
  const approved = autoApprovesProperty(me);

  const property = await queryOne(
    `INSERT INTO properties (
       name, project_name, developer, type_id, description,
       bedrooms, bathrooms, built_up_area, plot_size, price,
       community, exact_location, google_maps_url, amenities,
       availability, completion_date, assigned_agent_id,
       owner_name, owner_phone, owner_email,
       approval_status, created_by, approved_by, approved_at
     ) VALUES (
       $1,$2,$3,$4,$5,
       $6,$7,$8,$9,$10,
       $11,$12,$13,$14,
       $15,$16,$17,
       $18,$19,$20,
       $21,$22,$23,$24
     )
     RETURNING id, name, approval_status`,
    [
      p.name, p.project_name, p.developer, p.type_id, p.description,
      p.bedrooms, p.bathrooms, p.built_up_area, p.plot_size, p.price,
      p.community, p.exact_location, p.google_maps_url,
      JSON.stringify(p.amenities),
      p.availability, p.completion_date, p.assigned_agent_id,
      p.owner_name, p.owner_phone, p.owner_email,
      approved ? "approved" : "pending",
      me.id,
      approved ? me.id : null,
      approved ? new Date() : null,
    ],
  );

  return Response.json({ property }, { status: 201 });
}