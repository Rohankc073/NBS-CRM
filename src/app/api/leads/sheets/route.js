import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";

function canManage(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

// Extract the sheet ID from either a full URL or a raw ID.
function extractSheetId(input) {
  const s = String(input || "").trim();
  const m = s.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // If they pasted just the ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return null;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me || !canManage(me)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const sheets = await query(
    `SELECT ls.*, src.name AS source_name
     FROM lead_sheets ls
     LEFT JOIN lead_sources src ON src.id = ls.source_id
     ORDER BY ls.created_at DESC`,
  );
  return Response.json({ sheets });
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || !canManage(me)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

  const { name, url, campaign, source_id } = body;
  if (!name || !url) return Response.json({ error: "Name and sheet URL are required" }, { status: 400 });

  const sheetId = extractSheetId(url);
  if (!sheetId) return Response.json({ error: "Could not read a sheet ID from that URL" }, { status: 400 });

  const sheet = await queryOne(
    `INSERT INTO lead_sheets (name, sheet_id, campaign, source_id, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name`,
    [name, sheetId, campaign || null, source_id || null, me.id],
  );
  return Response.json({ sheet }, { status: 201 });
}