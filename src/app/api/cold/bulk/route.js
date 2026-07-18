import { getCurrentUser } from "@/server/auth/session";
import { importContacts } from "@/server/cold/import";
import Papa from "papaparse";

function canImport(u) {
  return u?.role === "super_admin" || u?.role === "admin";
}

// GET -> download a template.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canImport(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const cols = [
    "NAME",
    "PHONE",
    "MOBILE",
    "SECONDARY MOBILE",
    "EMAIL",
    "BUILDING",
    "UNIT NUMBER",
    "NO OF BEDS",
    "SQFT",
    "REMARK",
  ];
  const example = [
    "Ahmed Ali",
    "+97143221100",
    "+971501234567",
    "",
    "ahmed@example.com",
    "Marina Heights",
    "1204",
    "2",
    "1180",
    "Owner, may sell",
  ];
  const csv = Papa.unparse({ fields: cols, data: [example] });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="cold-contacts-template.csv"',
    },
  });
}

// POST -> import. form-data: file, batch (label), auto_assign ("true"/"false")
export async function POST(request) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!canImport(me))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const batch = (formData.get("batch") || "").toString().trim() || null;
  const autoAssign = formData.get("auto_assign") === "true";

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (!parsed.data.length) {
    return Response.json(
      { error: "The file has no data rows" },
      { status: 400 },
    );
  }

  const headers = parsed.meta.fields || [];

  try {
    const result = await importContacts(parsed.data, headers, {
      batch,
      autoAssign,
      createdBy: me.id,
    });
    if (result.error)
      return Response.json({ error: result.error }, { status: 400 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: "Import failed: " + err.message },
      { status: 500 },
    );
  }
}
