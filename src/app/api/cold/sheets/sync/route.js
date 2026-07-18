import { getCurrentUser } from "@/server/auth/session";
import { syncAllColdSheets, syncColdSheet } from "@/server/cold/sync";
import { queryOne } from "@/server/db";

function canManage(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || !canManage(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const sheet = await queryOne(`SELECT * FROM cold_sheets WHERE id = $1`, [
        id,
      ]);
      if (!sheet)
        return Response.json({ error: "Sheet not found" }, { status: 404 });
      const result = await syncColdSheet(sheet);
      return Response.json({ ok: true, result });
    } else {
      const results = await syncAllColdSheets();
      return Response.json({ ok: true, results });
    }
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
