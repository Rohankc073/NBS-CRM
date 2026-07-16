import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { ROLE_LABEL, canApproveProperty } from "@/server/authz/policy";
import { queryOne, query } from "@/server/db";
import CrmShell from "@/components/CrmShell";

export default async function Dashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isManager = me.role === "super_admin" || me.role === "admin";

  // Scope: managers see everything, agents see only their own leads.
  // We build a WHERE fragment used by every lead stat below.
  const scope = isManager ? "" : "AND l.assigned_to = $1";
  const scopeParams = isManager ? [] : [me.id];

  // One query, many counts — cheap and fast.
  const leadStats = await queryOne(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE s.is_default)::int AS new_leads,
       COUNT(*) FILTER (WHERE s.is_won)::int AS won,
       COUNT(*) FILTER (WHERE s.is_lost)::int AS lost,
       COUNT(*) FILTER (
         WHERE l.next_follow_up_at IS NOT NULL
           AND l.next_follow_up_at::date <= CURRENT_DATE
       )::int AS due_today
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     WHERE l.deleted_at IS NULL ${scope}`,
    scopeParams,
  );

  // Pipeline breakdown by status (for a mini bar list).
  const pipeline = await query(
    `SELECT s.name, s.color, COUNT(l.id)::int AS count
     FROM lead_statuses s
     LEFT JOIN leads l ON l.status_id = s.id AND l.deleted_at IS NULL ${scope}
     WHERE s.is_active = TRUE
     GROUP BY s.id, s.name, s.color, s.sort_order
     HAVING COUNT(l.id) > 0
     ORDER BY s.sort_order`,
    scopeParams,
  );

  // Property stats — managers only.
  let propStats = null;
  if (isManager) {
    propStats = await queryOne(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending
       FROM properties WHERE deleted_at IS NULL`,
    );
  }

  const cards = [
    { label: isManager ? "Total leads" : "My leads", value: leadStats.total, href: "/leads" },
    { label: isManager ? "New leads" : "My new leads", value: leadStats.new_leads, href: "/leads?status=" },
    { label: "Follow-ups due", value: leadStats.due_today, href: "/leads", alert: leadStats.due_today > 0 },
    { label: "Closed (won)", value: leadStats.won, href: "/leads" },
  ];
  if (isManager && propStats) {
    cards.push({ label: "Properties", value: propStats.total, href: "/properties" });
    cards.push({
      label: "Pending approval",
      value: propStats.pending,
      href: "/properties?status=pending",
      alert: propStats.pending > 0,
    });
  }

  const maxPipe = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <div className="border-b border-[#E4E1DA] pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6C7A78]">{me.name} - {ROLE_LABEL[me.role]}</p>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className={
                "rounded-lg border bg-white p-5 transition hover:border-[#1F7A6B] " +
                (c.alert ? "border-[#C58A12]" : "border-[#E4E1DA]")
              }
            >
              <div className={"text-2xl font-semibold " + (c.alert ? "text-[#C58A12]" : "text-[#14201F]")}>
                {c.value}
              </div>
              <div className="mt-1 text-xs text-[#6C7A78]">{c.label}</div>
            </Link>
          ))}
        </div>

        {/* Follow-ups banner */}
        {leadStats.due_today > 0 ? (
          <div className="mt-6 rounded-lg border border-[#C58A12]/40 bg-[#C58A12]/5 p-4 text-sm text-[#8a6410]">
            You have {leadStats.due_today} lead{leadStats.due_today === 1 ? "" : "s"} to follow up today.{" "}
            <Link href="/leads" className="font-medium underline">View leads</Link>
          </div>
        ) : null}

        {/* Pipeline breakdown */}
        {pipeline.length > 0 ? (
          <div className="mt-6 rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
              {isManager ? "Pipeline" : "My pipeline"}
            </h2>
            <div className="space-y-2">
              {pipeline.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-xs text-[#6C7A78]">{p.name}</div>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded"
                      style={{
                        width: `${Math.max(4, (p.count / maxPipe) * 100)}%`,
                        background: (p.color || "#1F7A6B") + "40",
                        borderLeft: `3px solid ${p.color || "#1F7A6B"}`,
                      }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-medium text-[#14201F]">
                    {p.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </CrmShell>
  );
}