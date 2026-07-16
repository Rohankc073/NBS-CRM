import { getCurrentUser } from "@/server/auth/session";
import { queryOne } from "@/server/db";
import { syncSheet, syncAllSheets } from "@/server/leads/sync";

function canManage(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || !canManage(me)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      // Sync one specific sheet.
      const sheet = await queryOne(`SELECT * FROM lead_sheets WHERE id = $1`, [id]);
      if (!sheet) return Response.json({ error: "Sheet not found" }, { status: 404 });
      const result = await syncSheet(sheet);
      return Response.json({ ok: true, result });
    } else {
      // Sync all active sheets.
      const results = await syncAllSheets();
      return Response.json({ ok: true, results });
    }
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}