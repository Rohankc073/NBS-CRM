import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { query } from "@/server/db";
import { redirect } from "next/navigation";
import ColdSheetsClient from "./ColdSheetsClient";

export default async function ColdSheetsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "super_admin" && me.role !== "admin") redirect("/cold");

  const sheets = await query(
    `SELECT * FROM cold_sheets ORDER BY created_at DESC`,
  );

  const plain = sheets.map((s) => ({
    ...s,
    last_synced_at: s.last_synced_at?.toISOString?.() || null,
    created_at: s.created_at?.toISOString?.() || null,
  }));

  return (
    <CrmShell user={me} title="Cold Calling">
      <ColdSheetsClient initial={plain} />
    </CrmShell>
  );
}
