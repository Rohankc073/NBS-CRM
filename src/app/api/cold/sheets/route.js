import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";

function canManage(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

function extractSheetId(input) {
  const s = String(input || "").trim();
  const m = s.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return null;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me || !canManage(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const sheets = await query(
    `SELECT * FROM cold_sheets ORDER BY created_at DESC`,
  );
  return Response.json({ sheets });
}

export async function POST(request) {
  const me = await getCurrentUser();
  if (!me || !canManage(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, url, batch, auto_assign } = body;
  if (!name || !url)
    return Response.json(
      { error: "Name and sheet URL are required" },
      { status: 400 },
    );

  const sheetId = extractSheetId(url);
  if (!sheetId)
    return Response.json(
      { error: "Could not read a sheet ID from that URL" },
      { status: 400 },
    );

  const sheet = await queryOne(
    `INSERT INTO cold_sheets (name, sheet_id, batch, auto_assign, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
    [name, sheetId, batch || null, !!auto_assign, me.id],
  );
  return Response.json({ sheet }, { status: 201 });
}
