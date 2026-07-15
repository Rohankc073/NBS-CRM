import { getCurrentUser } from "@/server/auth/session";
import { canApproveProperty } from "@/server/authz/policy";
import { query, transaction } from "@/server/db";
import Papa from "papaparse";
import { z } from "zod";

// The columns in the template. Order here = order in the CSV.
const COLUMNS = [
  "name", "project_name", "developer", "type", "description",
  "bedrooms", "bathrooms", "built_up_area", "plot_size", "price",
  "community", "exact_location", "google_maps_url",
  "availability", "completion_date",
  "owner_name", "owner_phone", "owner_email",
];

// GET → download a blank template with headers + one example row.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const example = [
    "Marina Heights 2BR", "Marina Heights", "Emaar", "Apartment",
    "Spacious 2-bedroom with sea view",
    "2", "2", "1200", "", "1850000",
    "Dubai Marina", "Marina Walk, Tower 2",
    "https://maps.google.com/...",
    "available", "2025-12-31",
    "Ahmed Ali", "+971501234567", "owner@example.com",
  ];

  const csv = Papa.unparse({ fields: COLUMNS, data: [example] });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="property-import-template.csv"',
    },
  });
}

// Validation for one row. Empty optional fields → null.
const emptyToNull = (v) => (v === "" || v == null ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().nullable());
const int = z.preprocess(emptyToNull, z.coerce.number().int().nullable());
const str = z.preprocess(emptyToNull, z.string().max(2000).nullable());

const rowSchema = z.object({
  name: z.string().trim().min(2, "name is required"),
  project_name: str, developer: str, description: str,
  bedrooms: int, bathrooms: int,
  built_up_area: num, plot_size: num, price: num,
  community: str, exact_location: str, google_maps_url: str,
  availability: z.preprocess(
    (v) => (v === "" || v == null ? "available" : v),
    z.enum(["available", "reserved", "sold", "rented", "off_market"]),
  ),
  completion_date: str,
  owner_name: str, owner_phone: str, owner_email: str,
});

// POST → validate the whole file. If ANY row fails, import nothing.
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (!parsed.data.length) {
    return Response.json({ error: "The file has no data rows" }, { status: 400 });
  }

  // Map property-type NAMES to ids up front, so "Villa" → uuid.
  const types = await query(`SELECT id, name FROM property_types WHERE is_active = TRUE`);
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));

  const errors = [];
  const valid = [];

  parsed.data.forEach((raw, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-based

    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`Row ${rowNum}: ${result.error.issues[0].message}`);
      return;
    }

    // Resolve the type name → id (optional column).
    let typeId = null;
    const typeName = (raw.type || "").trim().toLowerCase();
    if (typeName) {
      typeId = typeByName.get(typeName);
      if (!typeId) {
        errors.push(`Row ${rowNum}: unknown property type "${raw.type}"`);
        return;
      }
    }

    valid.push({ ...result.data, type_id: typeId });
  });

  // All-or-nothing: any error → import nothing.
  if (errors.length) {
    return Response.json(
      { error: "Import cancelled — fix these and re-upload:", details: errors },
      { status: 400 },
    );
  }

  // Insert every row in ONE transaction — all succeed or none do.
  await transaction(async (client) => {
    for (const r of valid) {
      await client.query(
        `INSERT INTO properties (
           name, project_name, developer, type_id, description,
           bedrooms, bathrooms, built_up_area, plot_size, price,
           community, exact_location, google_maps_url,
           availability, completion_date,
           owner_name, owner_phone, owner_email,
           approval_status, created_by, approved_by, approved_at
         ) VALUES (
           $1,$2,$3,$4,$5, $6,$7,$8,$9,$10,
           $11,$12,$13, $14,$15, $16,$17,$18,
           'approved', $19, $19, NOW()
         )`,
        [
          r.name, r.project_name, r.developer, r.type_id, r.description,
          r.bedrooms, r.bathrooms, r.built_up_area, r.plot_size, r.price,
          r.community, r.exact_location, r.google_maps_url,
          r.availability, r.completion_date,
          r.owner_name, r.owner_phone, r.owner_email,
          me.id,
        ],
      );
    }
  });

  return Response.json({ imported: valid.length });
}