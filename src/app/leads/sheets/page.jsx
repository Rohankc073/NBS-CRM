import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { query } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import SheetsClient from "./SheetsClient";

export default async function SheetsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/leads");

  const sheets = await query(
    `SELECT ls.*, src.name AS source_name
     FROM lead_sheets ls
     LEFT JOIN lead_sources src ON src.id = ls.source_id
     ORDER BY ls.created_at DESC`,
  );
  const sources = await query(
    `SELECT id, name FROM lead_sources WHERE is_active = TRUE ORDER BY name`,
  );

  const plain = sheets.map((s) => ({
    ...s,
    last_synced_at: s.last_synced_at?.toISOString?.() || null,
    created_at: s.created_at?.toISOString?.() || null,
  }));

  return (
    <CrmShell user={me}>
      <SheetsClient initial={plain} sources={sources} />
    </CrmShell>
  );
}