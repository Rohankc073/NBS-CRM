import { google } from "googleapis";

// Authenticates as the service-account robot using the JSON key file
// pointed to by GOOGLE_APPLICATION_CREDENTIALS. Read-only scope.
function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// Read all rows from a sheet. Returns { headers, rows } where rows is an
// array of objects keyed by the header names.
export async function readSheet(sheetId, range = "A1:Z10000") {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const values = res.data.values || [];
  if (values.length === 0) return { headers: [], rows: [] };

  const headers = values[0].map((h) => String(h || "").trim());
  const rows = values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });

  return { headers, rows };
}