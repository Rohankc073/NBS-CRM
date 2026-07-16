import { getCurrentUser } from "@/server/auth/session";
import { readSheet } from "@/server/leads/sheets";

export async function GET(request) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "super_admin" && me.role !== "admin")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sheetId = searchParams.get("id");
  if (!sheetId) return Response.json({ error: "Pass ?id=SHEET_ID" }, { status: 400 });

  try {
    const { headers, rows } = await readSheet(sheetId);
    return Response.json({ ok: true, headers, rowCount: rows.length, sample: rows.slice(0, 3) });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}