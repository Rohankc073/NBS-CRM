import { query, queryOne, transaction } from "@/server/db";
import { readSheet } from "@/server/leads/sheets";
import { pickNextAgent } from "@/server/leads/assign";
import { normalizePhone } from "@/lib/phone";

// Map common sheet header variations to our field names. Headers are
// normalized (lowercased, spaces/underscores stripped) before matching.
const FIELD_ALIASES = {
  name: ["name", "fullname", "full name", "leadname"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber"],
  alt_phone: ["altphone", "alternatephone", "alternatenumber", "phone2"],
  whatsapp: ["whatsapp", "whatsappnumber", "wa"],
  email: ["email", "emailaddress", "mail"],
  nationality: ["nationality", "country"],
  budget_min: ["budgetmin", "minbudget", "budgetfrom"],
  budget_max: ["budgetmax", "maxbudget", "budgetto"],
  preferred_type: ["preferredtype", "propertytype", "type"],
  preferred_location: ["preferredlocation", "location", "area", "community"],
  bedrooms: ["bedrooms", "beds", "bhk", "br"],
  notes: ["notes", "note", "comments", "remarks", "message"],
};

const norm = (s) => String(s || "").toLowerCase().replace(/[\s_-]/g, "");

// Build a map: our field -> the actual header string in this sheet.
function mapHeaders(headers) {
  const map = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const match = headers.find((h) => aliases.includes(norm(h)));
    if (match) map[field] = match;
  }
  return map;
}

const clean = (v) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const toNum = (v) => {
  const s = clean(v);
  if (s == null) return null;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
};

// Sync ONE sheet. Reads rows after last_row, imports new leads, advances
// last_row. Returns a summary string.
export async function syncSheet(sheetRow) {
  const { id, sheet_id, campaign, source_id, last_row } = sheetRow;

  // Read the whole sheet (Google has no "rows after N" option).
  const { headers, rows } = await readSheet(sheet_id);

  if (rows.length === 0) {
    return { imported: 0, skipped: 0, message: "Sheet is empty" };
  }

  const headerMap = mapHeaders(headers);
  if (!headerMap.name || !headerMap.phone) {
    return { imported: 0, skipped: 0, message: "Sheet must have name and phone columns" };
  }

  // Only process rows we haven't seen: those AFTER last_row.
  const newRows = rows.slice(last_row);
  if (newRows.length === 0) {
    return { imported: 0, skipped: 0, message: "No new rows" };
  }

  // Default status (New).
  const status = await queryOne(`SELECT id FROM lead_statuses WHERE is_default = TRUE LIMIT 1`);
  if (!status) return { imported: 0, skipped: 0, message: "No default status configured" };

  let imported = 0;
  let skipped = 0;
  const seen = new Set();

  await transaction(async (client) => {
    for (const raw of newRows) {
      const get = (field) => (headerMap[field] ? clean(raw[headerMap[field]]) : null);

      const name = get("name");
      const phoneRaw = get("phone");
      if (!name || !phoneRaw) { skipped++; continue; } // missing required

      const normalized = normalizePhone(phoneRaw);
      if (!normalized) { skipped++; continue; } // invalid phone

      // Dedup within this batch...
      if (seen.has(normalized)) { skipped++; continue; }
      seen.add(normalized);

      // ...and against existing leads in the DB.
      const existing = await client.query(
        `SELECT id FROM leads WHERE phone_normalized = $1 AND deleted_at IS NULL`,
        [normalized],
      );
      if (existing.rows.length) { skipped++; continue; }

      const agentId = await pickNextAgent(client);

      await client.query(
        `INSERT INTO leads (
           name, phone, phone_normalized, alt_phone, whatsapp, email, nationality,
           budget_min, budget_max, preferred_type, preferred_location, bedrooms,
           notes, status_id, source_id, campaign, assigned_to
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7, $8,$9,$10,$11,$12, $13,$14,$15,$16,$17
         )`,
        [
          name, phoneRaw, normalized,
          get("alt_phone"), get("whatsapp"), get("email"), get("nationality"),
          toNum(get("budget_min")), toNum(get("budget_max")),
          get("preferred_type"), get("preferred_location"), get("bedrooms"),
          get("notes"), status.id, source_id, campaign, agentId,
        ],
      );
      imported++;
    }

    // Advance last_row to the total row count so we never re-read these.
    await client.query(
      `UPDATE lead_sheets
         SET last_row = $1, last_synced_at = NOW(), last_result = $2
       WHERE id = $3`,
      [rows.length, `Imported ${imported}, skipped ${skipped}`, id],
    );
  });

  return { imported, skipped, message: `Imported ${imported}, skipped ${skipped}` };
}

// Sync ALL active sheets — this is what the poller calls.
export async function syncAllSheets() {
  const sheets = await query(`SELECT * FROM lead_sheets WHERE is_active = TRUE`);
  const results = [];
  for (const s of sheets) {
    try {
      const r = await syncSheet(s);
      results.push({ sheet: s.name, ...r });
    } catch (err) {
      results.push({ sheet: s.name, error: err.message });
    }
  }
  return results;
}