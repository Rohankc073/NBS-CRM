import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth/session";
import { canCreateProperty } from "@/server/authz/policy";
import { queryOne } from "@/server/db";

// What we accept, per kind. Checked BEFORE writing to disk — an upload
// endpoint that skips this is how servers end up hosting malware.
const RULES = {
  image:      { types: ["image/jpeg", "image/png", "image/webp"], maxMB: 8 },
  floor_plan: { types: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxMB: 15 },
  brochure:   { types: ["application/pdf"], maxMB: 25 },
};

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

  // Visibility: reviewers see anything; others only approved or their own.
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
export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canCreateProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Property must exist and belong to this user — unless they're a reviewer.
  const prop = await queryOne(
    `SELECT id, created_by FROM properties WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!prop) return Response.json({ error: "Property not found" }, { status: 404 });

  const isReviewer = me.role === "super_admin" || me.role === "admin";
  if (!isReviewer && prop.created_by !== me.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const kind = formData.get("kind");
  const files = formData.getAll("files");

  const rule = RULES[kind];
  if (!rule) return Response.json({ error: "Invalid file kind" }, { status: 400 });

  // Files go in public/uploads/properties/<id>/ so the browser can load them.
  const dir = path.join(process.cwd(), "public", "uploads", "properties", id);
  await mkdir(dir, { recursive: true });

  const saved = [];
  for (const file of files) {
    if (typeof file === "string") continue;

    if (!rule.types.includes(file.type)) {
      return Response.json({ error: `${file.name}: unsupported file type` }, { status: 400 });
    }
    if (file.size > rule.maxMB * 1024 * 1024) {
      return Response.json({ error: `${file.name}: exceeds ${rule.maxMB}MB` }, { status: 400 });
    }

    // Never trust the uploaded name — it could be "../../etc/passwd".
    // Generate our own; keep only the extension.
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, safeName), buffer);

    // Store the PUBLIC url path in the DB, not the disk path.
    const urlPath = `/uploads/properties/${id}/${safeName}`;
    const row = await queryOne(
      `INSERT INTO property_media (property_id, kind, file_path, original_name, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, kind, file_path`,
      [id, kind, urlPath, file.name, file.size],
    );
    saved.push(row);
  }

  return Response.json({ media: saved }, { status: 201 });
}