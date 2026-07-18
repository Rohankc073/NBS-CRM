import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import ColdDetailClient from "./ColdDetailClient";

export default async function ColdDetailPage({ params }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { id } = await params;

  const contact = await queryOne(
    `SELECT c.*, u.name AS agent_name, l.ref_no AS lead_ref
     FROM cold_contacts c
     LEFT JOIN users u ON u.id = c.assigned_to
     LEFT JOIN leads l ON l.id = c.converted_lead_id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [id],
  );
  if (!contact) notFound();

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && contact.assigned_to !== me.id) redirect("/cold");

  const activity = await query(
    `SELECT a.channel, a.note, a.created_at, u.name AS by_name
     FROM contact_activity a
     LEFT JOIN users u ON u.id = a.done_by
     WHERE a.contact_id = $1
     ORDER BY a.created_at DESC`,
    [id],
  );

  const plain = {
    ...contact,
    next_follow_up_at: contact.next_follow_up_at?.toISOString?.() || null,
    created_at: contact.created_at?.toISOString?.() || null,
    converted_at: contact.converted_at?.toISOString?.() || null,
  };
  const plainActivity = activity.map((a) => ({
    ...a,
    created_at: a.created_at?.toISOString?.() || null,
  }));

  return (
    <CrmShell user={me} title="Cold Calling">
      <ColdDetailClient
        contact={plain}
        activity={plainActivity}
        canManage={isManager}
      />
    </CrmShell>
  );
}
