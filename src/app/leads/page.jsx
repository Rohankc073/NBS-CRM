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

  if (!isManager) {
    params.push(me.id);
    where.push(`l.assigned_to = $${params.length}`);
  }
  if (statusId !== "all") {
    params.push(statusId);
    where.push(`l.status_id = $${params.length}`);
  }
  if (search) {
    const asNum = parseInt(search.replace("#", ""), 10);
    if (!isNaN(asNum) && String(asNum) === search.replace("#", "").trim()) {
      params.push(asNum);
      where.push(`l.ref_no = $${params.length}`);
    } else {
      params.push(`%${search}%`);
      where.push(
        `(l.name ILIKE $${params.length} OR l.phone ILIKE $${params.length})`,
      );
    }
  }
  const whereSql = where.join(" AND ");

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM leads l WHERE ${whereSql}`,
    params,
  );
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const leads = await query(
    `SELECT l.id, l.ref_no, l.name, l.phone, l.email, l.campaign,
            l.budget_min, l.budget_max, l.preferred_type, l.preferred_location,
            l.next_follow_up_at, l.created_at,
            s.name AS status_name, s.color AS status_color,
            src.name AS source_name, u.name AS agent_name
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     LEFT JOIN lead_sources src ON src.id = l.source_id
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE ${whereSql}
     ORDER BY l.created_at DESC, l.ref_no DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params,
  );

  const statuses = await query(
    `SELECT id, name FROM lead_statuses WHERE is_active = TRUE ORDER BY sort_order`,
  );
  const sources = await query(
    `SELECT id, name FROM lead_sources WHERE is_active = TRUE ORDER BY name`,
  );

  // Tab counts — total + a few key statuses. Scoped to the agent if needed.
  const scope = isManager ? "" : "AND l.assigned_to = $1";
  const scopeParams = isManager ? [] : [me.id];
  const counts = await queryOne(
    `SELECT
       COUNT(*)::int AS all,
       COUNT(*) FILTER (WHERE s.name = 'New')::int AS new,
       COUNT(*) FILTER (WHERE s.name = 'Hot')::int AS hot,
       COUNT(*) FILTER (WHERE s.name = 'Warm')::int AS warm,
       COUNT(*) FILTER (WHERE s.name = 'Interested')::int AS interested
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     WHERE l.deleted_at IS NULL ${scope}`,
    scopeParams,
  );

  // Map key status names to their IDs so tabs can filter by id.
  const keyStatuses = await query(
    `SELECT id, name FROM lead_statuses
     WHERE name IN ('New','Hot','Warm','Interested') AND is_active = TRUE`,
  );
  const statusIdByName = {};
  keyStatuses.forEach((s) => { statusIdByName[s.name] = s.id; });

  // Agents for bulk-assign (managers only).
  const agents = isManager
    ? await query(
        `SELECT id, name FROM users
         WHERE role IN ('sales_agent','telecaller') AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY name`,
      )
    : [];

  return (
    <CrmShell user={me}>
      <LeadsClient
        initial={leads}
        statuses={statuses}
        sources={sources}
        canImport={isManager}
        agents={agents}
        page={page}
        totalPages={totalPages}
        total={total}
        statusId={statusId}
        search={search}
        counts={counts}
        statusIdByName={statusIdByName}
      />
    </CrmShell>
  );
}