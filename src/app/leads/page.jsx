import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import { redirect } from "next/navigation";
import LeadsClient from "./LeadsClient";

const PAGE_SIZE = 25;

export default async function LeadsPage({ searchParams }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const statusId = sp.status || "all";
  const search = (sp.q || "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const isManager = me.role === "super_admin" || me.role === "admin";

  const where = ["l.deleted_at IS NULL"];
  const params = [];

  // Agents & telecallers see ONLY their own leads. Managers see all.
  if (!isManager) {
    params.push(me.id);
    where.push(`l.assigned_to = $${params.length}`);
  }
  if (statusId !== "all") {
    params.push(statusId);
    where.push(`l.status_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length})`,
    );
  }
  const whereSql = where.join(" AND ");

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM leads l WHERE ${whereSql}`,
    params,
  );
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const leads = await query(
    `SELECT l.id, l.name, l.phone, l.email, l.campaign, l.next_follow_up_at,
            l.created_at, s.name AS status_name, s.color AS status_color,
            src.name AS source_name, u.name AS agent_name
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     LEFT JOIN lead_sources src ON src.id = l.source_id
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params,
  );

  // Dropdown data for filters + the bulk panel.
  const statuses = await query(
    `SELECT id, name FROM lead_statuses WHERE is_active = TRUE ORDER BY sort_order`,
  );
  const sources = await query(
    `SELECT id, name FROM lead_sources WHERE is_active = TRUE ORDER BY name`,
  );

  return (
    <CrmShell user={me}>
      <LeadsClient
        initial={leads}
        statuses={statuses}
        sources={sources}
        canImport={isManager}
        page={page}
        totalPages={totalPages}
        total={total}
        statusId={statusId}
        search={search}
      />
    </CrmShell>
  );
}
