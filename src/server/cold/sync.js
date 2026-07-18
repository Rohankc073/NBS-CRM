import { importContacts } from "@/server/cold/import";
import { query } from "@/server/db";
import { readSheet } from "@/server/leads/sheets";

// Sync one cold-calling sheet: read rows after last_row, import new ones.
export async function syncColdSheet(sheetRow) {
  const { id, sheet_id, batch, auto_assign, last_row, created_by } = sheetRow;

  const { headers, rows } = await readSheet(sheet_id);
  if (rows.length === 0)
    return { imported: 0, skipped: 0, message: "Sheet is empty" };

  // Only process rows we haven't seen.
  const newRows = rows.slice(last_row);
  if (newRows.length === 0)
    return { imported: 0, skipped: 0, message: "No new rows" };

  const result = await importContacts(newRows, headers, {
    batch: batch || sheetRow.name,
    autoAssign: auto_assign,
    createdBy: created_by,
  });

  if (result.error) return { imported: 0, skipped: 0, message: result.error };

  // Advance last_row so we never re-read these.
  await query(
    `UPDATE cold_sheets SET last_row = $1, last_synced_at = NOW(), last_result = $2 WHERE id = $3`,
    [rows.length, `Imported ${result.imported}, skipped ${result.skipped}`, id],
  );

  return {
    ...result,
    message: `Imported ${result.imported}, skipped ${result.skipped}`,
  };
}

export async function syncAllColdSheets() {
  const sheets = await query(
    `SELECT * FROM cold_sheets WHERE is_active = TRUE`,
  );
  const results = [];
  for (const s of sheets) {
    try {
      const r = await syncColdSheet(s);
      results.push({ sheet: s.name, ...r });
    } catch (err) {
      results.push({ sheet: s.name, error: err.message });
    }
  }
  return results;
}
