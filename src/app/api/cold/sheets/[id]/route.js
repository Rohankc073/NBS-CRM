import { getCurrentUser } from "@/server/auth/session";
import { query } from "@/server/db";

export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me || (me.role !== "super_admin" && me.role !== "admin")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await query(`DELETE FROM cold_sheets WHERE id = $1`, [id]);
  return Response.json({ ok: true });
}
