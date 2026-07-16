import { normalizePhone } from "@/lib/phone";
import { getCurrentUser } from "@/server/auth/session";
import { queryOne, transaction } from "@/server/db";
import { pickNextAgent } from "@/server/leads/assign";
import Papa from "papaparse";
import { z } from "zod";

// Who can import leads: admins and super admins (they manage intake).
function canImport(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

// The template columns. name + phone required; the rest optional and
// vary by campaign.
const COLUMNS = [
  "name",
  "phone",
  "alt_phone",
  "whatsapp",
  "email",
  "nationality",
  "budget_min",
  "budget_max",
  "preferred_type",
  "preferred_location",
  "bedrooms",
  "notes",
];

// GET -> download the blank template.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canImport(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const example = [
    "Ahmed Ali",
    "+971501234567",
    "+971505556677",
    "+971501234567",
    "ahmed@example.com",
    "UAE",
    "1000000",
    "1500000",
    "Apartment",
    "Dubai Marina",
    "2",
    "Interested in 2BR sea view",
  ];
  const csv = Papa.unparse({ fields: COLUMNS, data: [example] });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="lead-import-template.csv"',
    },
  });
}

const emptyToNull = (v) => (v === "" || v == null ? null : v);
const num = z.preprocess(emptyToNull, z.coerce.number().nullable());
const str = z.preprocess(emptyToNull, z.string().max(2000).nullable());

const rowSchema = z.object({
  name: z.string().trim().min(2, "name is required"),
  phone: z.string().trim().min(5, "phone is required"),
  alt_phone: str,
  whatsapp: str,
  email: str,
  nationality: str,
  budget_min: num,
  budget_max: num,
  preferred_type: str,
  preferred_location: str,
  bedrooms: str,
  notes: str,
});

// POST -> validate + import. All-or-nothing.
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canImport(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const sourceId = formData.get("source_id") || null;
  const campaign = (formData.get("campaign") || "").toString().trim() || null;

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (!parsed.data.length) {
    return Response.json(
      { error: "The file has no data rows" },
      { status: 400 },
    );
  }

  // Default status = the one flagged is_default (New).
  const status = await queryOne(
    `SELECT id FROM lead_statuses WHERE is_default = TRUE LIMIT 1`,
  );
  if (!status) {
    return Response.json(
      { error: "No default lead status configured" },
      { status: 500 },
    );
  }

  const errors = [];
  const valid = [];
  const seenPhones = new Set();

  parsed.data.forEach((raw, i) => {
    const rowNum = i + 2;
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`Row ${rowNum}: ${result.error.issues[0].message}`);
      return;
    }
    const d = result.data;

    // Normalize phone for dedup. Invalid numbers fail the row.
    const normalized = normalizePhone(d.phone);
    if (!normalized) {
      errors.push(`Row ${rowNum}: invalid phone "${d.phone}"`);
      return;
    }
    // Duplicate within the same file.
    if (seenPhones.has(normalized)) {
      errors.push(`Row ${rowNum}: duplicate phone in file (${d.phone})`);
      return;
    }
    seenPhones.add(normalized);

    valid.push({ ...d, phone_normalized: normalized });
  });

  if (errors.length) {
    return Response.json(
      { error: "Import cancelled - fix these and re-upload:", details: errors },
      { status: 400 },
    );
  }

  // Insert all in one transaction, auto-assigning each via round-robin.
  let imported = 0;
  const skipped = [];
  try {
    await transaction(async (client) => {
      for (const r of valid) {
        // Skip if this phone already exists in the DB (active lead).
        const existing = await client.query(
          `SELECT id FROM leads WHERE phone_normalized = $1 AND deleted_at IS NULL`,
          [r.phone_normalized],
        );
        if (existing.rows.length) {
          skipped.push(r.phone);
          continue;
        }

        const agentId = await pickNextAgent(client);

        await client.query(
          `INSERT INTO leads (
             name, phone, phone_normalized, alt_phone, whatsapp, email, nationality,
             budget_min, budget_max, preferred_type, preferred_location, bedrooms,
             notes, status_id, source_id, campaign, assigned_to, created_by
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7, $8,$9,$10,$11,$12, $13,$14,$15,$16,$17,$18
           )`,
          [
            r.name,
            r.phone,
            r.phone_normalized,
            r.alt_phone,
            r.whatsapp,
            r.email,
            r.nationality,
            r.budget_min,
            r.budget_max,
            r.preferred_type,
            r.preferred_location,
            r.bedrooms,
            r.notes,
            status.id,
            sourceId,
            campaign,
            agentId,
            me.id,
          ],
        );
        imported++;
      }
    });
  } catch (err) {
    return Response.json(
      { error: "Import failed: " + err.message },
      { status: 500 },
    );
  }

  return Response.json({ imported, skipped: skipped.length });
}
