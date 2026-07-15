import { unlink } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/server/auth/session";
import { canApproveProperty } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";

export async function DELETE(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  // Only Admin + Super Admin can remove media.
  if (!canApproveProperty(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { mediaId } = await params;

  const media = await queryOne(
    `SELECT file_path FROM property_media WHERE id = $1`,
    [mediaId],
  );
  if (!media) return Response.json({ error: "Not found" }, { status: 404 });

  // Remove the DB row first — that's what the app reads. Then the file.
  await query(`DELETE FROM property_media WHERE id = $1`, [mediaId]);

  try {
    // file_path is like /uploads/properties/<id>/x.jpg — the real file
    // lives under public/. Delete it so orphaned files don't pile up.
    await unlink(path.join(process.cwd(), "public", media.file_path));
  } catch {
    // File already gone or moved — the DB row was the source of truth,
    // and it's deleted. Nothing more to do.
  }

  return Response.json({ ok: true });
}