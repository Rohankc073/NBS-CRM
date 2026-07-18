import { normalizePhone } from "@/lib/phone";
import { query, queryOne, transaction } from "@/server/db";
import { pickNextAgent } from "@/server/leads/assign";
import { readSheet } from "@/server/leads/sheets";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s_\-?.]/g, "");

// Recognized fields and their header aliases (compared after norm()).
// NOTE: the Meta budget QUESTION ("what is your budget...") is deliberately
// NOT here - it's a free-text range we keep as-is in the campaign responses.
const FIELD_ALIASES = {
  phone: [
    "phone",
    "phonenumber",
    "mobile",
    "mobilenumber",
    "contact",
    "contactnumber",
    "phoneno",
  ],
  alt_phone: [
    "altphone",
    "alternatephone",
    "alternatenumber",
    "phone2",
    "secondaryphone",
  ],
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

const FULLNAME = ["name", "fullname", "leadname"];
const FIRSTNAME = ["firstname"];
const LASTNAME = ["lastname", "surname"];

// The sheet's campaign name column.
const CAMPAIGN_COLS = ["campaignname", "campaign"];

// Meta / system columns we ignore (never stored). campaign_name handled
// separately above, so it's not here.
const SKIP = new Set([
  "id",
  "createdtime",
  "adid",
  "adname",
  "adsetid",
  "adsetname",
  "campaignid",
  "formid",
  "formname",
  "isorganic",
  "platform",
  "leadstatus",
  "trackingparameters",
]);

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

// Clean a phone for DISPLAY: strip Meta's "p:" prefix. (Normalization for
// dedup happens separately via normalizePhone.)
const cleanPhoneDisplay = (v) => {
  const s = clean(v);
  return s ? s.replace(/^p:/i, "").trim() : s;
};

function buildMapping(headers) {
  const map = {};
  const nameHeaders = {};
  let campaignHeader = null;
  const extraHeaders = [];

  for (const h of headers) {
    const n = norm(h);
    if (FULLNAME.includes(n)) {
      nameHeaders.full = h;
      continue;
    }
    if (FIRSTNAME.includes(n)) {
      nameHeaders.first = h;
      continue;
    }
    if (LASTNAME.includes(n)) {
      nameHeaders.last = h;
      continue;
    }
    if (CAMPAIGN_COLS.includes(n)) {
      campaignHeader = h;
      continue;
    }

    let matched = false;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(n)) {
        map[field] = h;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (SKIP.has(n)) continue;
    extraHeaders.push(h); // campaign questions (incl. the budget question)
  }
  return { map, nameHeaders, campaignHeader, extraHeaders };
}

function resolveName(row, nameHeaders) {
  if (nameHeaders.full && clean(row[nameHeaders.full]))
    return clean(row[nameHeaders.full]);
  const first = nameHeaders.first ? clean(row[nameHeaders.first]) : null;
  const last = nameHeaders.last ? clean(row[nameHeaders.last]) : null;
  return [first, last].filter(Boolean).join(" ") || null;
}

export async function syncSheet(sheetRow) {
  const {
    id,
    sheet_id,
    campaign: fallbackCampaign,
    source_id,
    last_row,
  } = sheetRow;

  const { headers, rows } = await readSheet(sheet_id);
  if (rows.length === 0)
    return { imported: 0, skipped: 0, message: "Sheet is empty" };

  const { map, nameHeaders, campaignHeader, extraHeaders } =
    buildMapping(headers);

  const hasName = nameHeaders.full || nameHeaders.first || nameHeaders.last;
  if (!hasName || !map.phone) {
    return {
      imported: 0,
      skipped: 0,
      message: "Sheet needs a name and phone column",
    };
  }

  const newRows = rows.slice(last_row);
  if (newRows.length === 0)
    return { imported: 0, skipped: 0, message: "No new rows" };

  const status = await queryOne(
    `SELECT id FROM lead_statuses WHERE is_default = TRUE LIMIT 1`,
  );
  if (!status)
    return { imported: 0, skipped: 0, message: "No default status configured" };

  let imported = 0,
    skipped = 0;
  const seen = new Set();

  await transaction(async (client) => {
    for (const raw of newRows) {
      const g = (field) => (map[field] ? clean(raw[map[field]]) : null);

      const name = resolveName(raw, nameHeaders);
      // Display phone: strip "p:". Normalized phone: for dedup.
      const phoneDisplay = cleanPhoneDisplay(g("phone"));
      if (!name || !phoneDisplay) {
        skipped++;
        continue;
      }

      const normalized = normalizePhone(phoneDisplay);
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
        `SELECT id FROM leads WHERE phone_normalized = $1 AND deleted_at IS NULL`,
        [normalized],
      );
      if (existing.rows.length) {
        skipped++;
        continue;
      }

      // Campaign: from the sheet's column, else the connection's typed name.
      const rowCampaign =
        (campaignHeader ? clean(raw[campaignHeader]) : null) ||
        fallbackCampaign;

      // Only explicit budget_min/max columns feed the numeric fields. The
      // Meta budget QUESTION stays as raw text in extra (below).
      const bmin = toNum(g("budget_min"));
      const bmax = toNum(g("budget_max"));

      // Campaign questions -> extra JSONB (raw, untouched).
      const extra = {};
      for (const h of extraHeaders) {
        const val = clean(raw[h]);
        if (val != null) extra[h] = val;
      }

      const agentId = await pickNextAgent(client);

      await client.query(
        `INSERT INTO leads (
           name, phone, phone_normalized, alt_phone, whatsapp, email, nationality,
           budget_min, budget_max, preferred_type, preferred_location, bedrooms,
           notes, extra, status_id, source_id, campaign, assigned_to
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7, $8,$9,$10,$11,$12, $13,$14,$15,$16,$17,$18
         )`,
        [
          name,
          phoneDisplay,
          normalized,
          cleanPhoneDisplay(g("alt_phone")),
          cleanPhoneDisplay(g("whatsapp")),
          g("email"),
          g("nationality"),
          bmin,
          bmax,
          g("preferred_type"),
          g("preferred_location"),
          g("bedrooms"),
          g("notes"),
          JSON.stringify(extra),
          status.id,
          source_id,
          rowCampaign,
          agentId,
        ],
      );
      imported++;
    }

    await client.query(
      `UPDATE lead_sheets SET last_row = $1, last_synced_at = NOW(), last_result = $2 WHERE id = $3`,
      [rows.length, `Imported ${imported}, skipped ${skipped}`, id],
    );
  });

  return {
    imported,
    skipped,
    message: `Imported ${imported}, skipped ${skipped}`,
  };
}

export async function syncAllSheets() {
  const sheets = await query(
    `SELECT * FROM lead_sheets WHERE is_active = TRUE`,
  );
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
