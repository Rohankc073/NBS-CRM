import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { ROLE_LABEL } from "@/server/authz/policy";
import { queryOne, query } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import DashboardClient from "./DashboardClient";

export default async function Dashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isManager = me.role === "super_admin" || me.role === "admin";
  const scope = isManager ? "" : "AND l.assigned_to = $1";
  const scopeParams = isManager ? [] : [me.id];

  const leadStats = await queryOne(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE s.is_default)::int AS new_leads,
       COUNT(*) FILTER (WHERE s.is_won)::int AS won,
       COUNT(*) FILTER (WHERE s.is_lost)::int AS lost,
       COUNT(*) FILTER (WHERE l.created_at >= CURRENT_DATE)::int AS today,
       COUNT(*) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS week,
       COUNT(*) FILTER (
         WHERE l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at::date <= CURRENT_DATE
       )::int AS due_today
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     WHERE l.deleted_at IS NULL ${scope}`,
    scopeParams,
  );

  const pipeline = await query(
    `SELECT s.name, s.color, s.sort_order, COUNT(l.id)::int AS count
     FROM lead_statuses s
     LEFT JOIN leads l ON l.status_id = s.id AND l.deleted_at IS NULL ${scope}
     WHERE s.is_active = TRUE
     GROUP BY s.id, s.name, s.color, s.sort_order
     ORDER BY s.sort_order`,
    scopeParams,
  );

  const sources = await query(
    `SELECT COALESCE(src.name, 'Unknown') AS name, COUNT(l.id)::int AS count
     FROM leads l
     LEFT JOIN lead_sources src ON src.id = l.source_id
     WHERE l.deleted_at IS NULL ${scope}
     GROUP BY src.name
     HAVING COUNT(l.id) > 0
     ORDER BY count DESC
     LIMIT 8`,
    scopeParams,
  );

  const trendRaw = await query(
    `SELECT to_char(d.day, 'DD Mon') AS label, COALESCE(c.n, 0)::int AS count
     FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d(day)
     LEFT JOIN (
       SELECT created_at::date AS day, COUNT(*) AS n
       FROM leads l
       WHERE l.deleted_at IS NULL ${scope}
       GROUP BY created_at::date
     ) c ON c.day = d.day
     ORDER BY d.day`,
    scopeParams,
  );

  let agents = [];
  let propStats = null;
  let coldStats = null;
  if (isManager) {
    agents = await query(
      `SELECT u.name,
              COUNT(l.id)::int AS total,
              COUNT(*) FILTER (WHERE s.is_won)::int AS won,
              COUNT(*) FILTER (
                WHERE l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at::date <= CURRENT_DATE
              )::int AS due
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id AND l.deleted_at IS NULL
       LEFT JOIN lead_statuses s ON s.id = l.status_id
       WHERE u.role IN ('sales_agent','telecaller') AND u.is_active = TRUE AND u.deleted_at IS NULL
       GROUP BY u.id, u.name
       ORDER BY total DESC
       LIMIT 10`,
    );
    propStats = await queryOne(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending
       FROM properties WHERE deleted_at IS NULL`,
    );
    coldStats = await queryOne(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'Converted')::int AS converted
       FROM cold_contacts WHERE deleted_at IS NULL`,
    );
  }

  const decided = leadStats.won + leadStats.lost;
  const conversion = decided > 0 ? Math.round((leadStats.won / decided) * 100) : 0;

  return (
    <CrmShell user={me} title="Dashboard">
      <DashboardClient
        me={{ name: me.name, role: me.role, roleLabel: ROLE_LABEL[me.role] }}
        isManager={isManager}
        leadStats={leadStats}
        conversion={conversion}
        pipeline={pipeline}
        sources={sources}
        trend={trendRaw}
        agents={agents}
        propStats={propStats}
        coldStats={coldStats}
      />
    </CrmShell>
  );
}