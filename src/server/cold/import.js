import { normalizePhone } from "@/lib/phone";
import { transaction } from "@/server/db";
import { pickNextAgent } from "@/server/leads/assign";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s_\-?.]/g, "");

// Map cold-call sheet headers to our fields.
const FIELD_ALIASES = {
  name: ["name", "fullname", "ownername", "contactname"],
  phone: ["phone", "phoneno", "phonenumber", "landline", "tel"],
  mobile: ["mobile", "mobileno", "mobilenumber", "cell"],
  secondary_mobile: [
    "secondarymobile",
    "secondarymobileno",
    "altmobile",
    "mobile2",
    "secondphone",
  ],
  email: ["email", "emailaddress", "mail"],
  building: ["building", "buildingname", "tower", "project"],
  unit_number: ["unitnumber", "unit", "unitno", "flatno", "apartment"],
  no_of_beds: ["noofbeds", "beds", "bedrooms", "bhk", "br", "bed"],
  sqft: ["sqft", "sqfeet", "squarefeet", "area", "size", "builtuparea"],
  remark: ["remark", "remarks", "note", "notes", "comment", "comments"],
};

// Columns we skip entirely (serial numbers, the channel-tracking columns
// which are handled by the app, and dates).
const SKIP = new Set([
  "sno",
  "srno",
  "serialno",
  "sn",
  "date",
  "call",
  "wa",
  "whatsapp",
  "email",
  "sms", // channel cols (email handled above as contact email if it maps; these tracking flags are ignored)
]);

const clean = (v) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

function buildMapping(headers) {
  const map = {};
  const extraHeaders = [];
  const usedFields = new Set();

  for (const h of headers) {
    const n = norm(h);
    let matched = false;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(n) && !usedFields.has(field)) {
        map[field] = h;
        usedFields.add(field);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (SKIP.has(n)) continue;
    extraHeaders.push(h);
  }
  return { map, extraHeaders };
}

// Import an array of row-objects into cold_contacts.
// opts: { batch, autoAssign, createdBy }
export async function importContacts(rows, headers, opts = {}) {
  const { batch = null, autoAssign = false, createdBy = null } = opts;

  const { map, extraHeaders } = buildMapping(headers);
  if (!map.name || !map.phone) {
    return {
      imported: 0,
      skipped: 0,
      error: "Sheet needs a name and phone column",
    };
  }

  let imported = 0,
    skipped = 0;
  const seen = new Set();

  await transaction(async (client) => {
    for (const raw of rows) {
      const g = (field) => (map[field] ? clean(raw[map[field]]) : null);

      const name = g("name");
      const phoneRaw = g("phone");
      if (!name || !phoneRaw) {
        skipped++;
        continue;
      }

      const normalized = normalizePhone(phoneRaw);
      if (!normalized) {
        skipped++;
        continue;
      }
      if (seen.has(normalized)) {
        skipped++;
        continue;
      }
      seen.add(normalized);

      const existing = await client.query(
        `SELECT id FROM cold_contacts WHERE phone_normalized = $1 AND deleted_at IS NULL`,
        [normalized],
      );
      if (existing.rows.length) {
        skipped++;
        continue;
      }

      // Unmapped columns -> extra.
      const extra = {};
      for (const h of extraHeaders) {
        const val = clean(raw[h]);
        if (val != null) extra[h] = val;
      }

      const agentId = autoAssign ? await pickNextAgent(client) : null;

      await client.query(
        `INSERT INTO cold_contacts (
           name, phone, phone_normalized, mobile, secondary_mobile, email,
           building, unit_number, no_of_beds, sqft, remark,
           extra, source_batch, assigned_to, created_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6, $7,$8,$9,$10,$11, $12,$13,$14,$15
         )`,
        [
          name,
          phoneRaw,
          normalized,
          g("mobile"),
          g("secondary_mobile"),
          g("email"),
          g("building"),
          g("unit_number"),
          g("no_of_beds"),
          g("sqft"),
          g("remark"),
          JSON.stringify(extra),
          batch,
          agentId,
          createdBy,
        ],
      );
      imported++;
    }
  });

  return { imported, skipped };
}
