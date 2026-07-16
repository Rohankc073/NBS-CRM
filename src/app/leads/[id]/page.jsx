import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import LeadDetailClient from "./LeadDetailClient";

export default async function LeadDetailPage({ params }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { id } = await params;

  const lead = await queryOne(
    `SELECT l.*, s.name AS status_name, src.name AS source_name, u.name AS agent_name
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     LEFT JOIN lead_sources src ON src.id = l.source_id
     LEFT JOIN users u ON u.id = l.assigned_to
     WHERE l.id = $1 AND l.deleted_at IS NULL`,
    [id],
  );
  if (!lead) notFound();

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && lead.assigned_to !== me.id) redirect("/leads");

  const statuses = await query(
    `SELECT id, name FROM lead_statuses WHERE is_active = TRUE ORDER BY sort_order`,
  );

  // Stage history, newest first, with names resolved.
  const history = await query(
    `SELECT h.created_at, h.notes,
            fs.name AS from_name, ts.name AS to_name, u.name AS by_name
     FROM lead_stage_history h
     LEFT JOIN lead_statuses fs ON fs.id = h.from_status_id
     LEFT JOIN lead_statuses ts ON ts.id = h.to_status_id
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.lead_id = $1
     ORDER BY h.created_at DESC`,
    [id],
  );

  // Serialize dates to plain strings for the client component.
  const plain = {
    ...lead,
    created_at: lead.created_at?.toISOString?.() || null,
    next_follow_up_at: lead.next_follow_up_at?.toISOString?.() || null,
    last_contacted_at: lead.last_contacted_at?.toISOString?.() || null,
  };
  const plainHistory = history.map((h) => ({
    ...h,
    created_at: h.created_at?.toISOString?.() || null,
  }));

  return (
    <CrmShell user={me}>
      <LeadDetailClient
        lead={plain}
        statuses={statuses}
        history={plainHistory}
      />
    </CrmShell>
  );
}