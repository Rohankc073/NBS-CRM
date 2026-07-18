import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { ROLE_LABEL } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  Trophy,
  UserPlus,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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
       COUNT(*) FILTER (
         WHERE l.next_follow_up_at IS NOT NULL
           AND l.next_follow_up_at::date <= CURRENT_DATE
       )::int AS due_today
     FROM leads l
     LEFT JOIN lead_statuses s ON s.id = l.status_id
     WHERE l.deleted_at IS NULL ${scope}`,
    scopeParams,
  );

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

  let propStats = null;
  if (isManager) {
    propStats = await queryOne(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending
       FROM properties WHERE deleted_at IS NULL`,
    );
  }

  // Conversion rate (won / (won + lost)), guarded against divide-by-zero.
  const decided = leadStats.won + leadStats.lost;
  const conversion =
    decided > 0 ? Math.round((leadStats.won / decided) * 100) : null;

  const cards = [
    {
      label: isManager ? "Total leads" : "My leads",
      value: leadStats.total,
      href: "/leads",
      icon: Users2,
      tint: "#2563EB",
    },
    {
      label: isManager ? "New leads" : "My new leads",
      value: leadStats.new_leads,
      href: "/leads",
      icon: UserPlus,
      tint: "#1F7A6B",
    },
    {
      label: "Follow-ups due",
      value: leadStats.due_today,
      href: "/leads",
      icon: CalendarClock,
      tint: "#C58A12",
      alert: leadStats.due_today > 0,
    },
    {
      label: "Closed (won)",
      value: leadStats.won,
      href: "/leads",
      icon: Trophy,
      tint: "#15803D",
    },
  ];
  if (isManager && propStats) {
    cards.push({
      label: "Properties",
      value: propStats.total,
      href: "/properties",
      icon: Building2,
      tint: "#7C3AED",
    });
    cards.push({
      label: "Pending approval",
      value: propStats.pending,
      href: "/properties?status=pending",
      icon: ClipboardCheck,
      tint: "#C58A12",
      alert: propStats.pending > 0,
    });
  }

  const maxPipe = Math.max(1, ...pipeline.map((p) => p.count));

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (me.name || "").split(/\s+/)[0];

  return (
    <CrmShell user={me} title="Dashboard">
      <div className="p-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#14201F]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {ROLE_LABEL[me.role]}
            {isManager ? " - brokerage overview" : " - your pipeline"}
            {conversion != null ? ` - ${conversion}% conversion` : ""}
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                className="group rounded-xl border border-[#E4E1DA] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className={
                        "text-3xl font-bold tracking-tight " +
                        (c.alert ? "text-[#C58A12]" : "text-[#14201F]")
                      }
                    >
                      {c.value}
                    </div>
                    <div className="mt-1 text-sm text-[#6C7A78]">{c.label}</div>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition group-hover:scale-105"
                    style={{ background: c.tint + "15" }}
                  >
                    <Icon size={20} style={{ color: c.tint }} strokeWidth={2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Follow-ups banner */}
        {leadStats.due_today > 0 ? (
          <Link
            href="/leads"
            className="mt-6 flex items-center gap-3 rounded-xl border border-[#C58A12]/40 bg-[#C58A12]/5 p-4 transition hover:bg-[#C58A12]/10"
          >
            <CalendarClock size={20} className="shrink-0 text-[#C58A12]" />
            <div className="text-sm text-[#8a6410]">
              <span className="font-semibold">
                {leadStats.due_today} lead{leadStats.due_today === 1 ? "" : "s"}
              </span>{" "}
              to follow up today. Click to view.
            </div>
          </Link>
        ) : null}

        {/* Pipeline breakdown */}
        {pipeline.length > 0 ? (
          <div className="mt-6 rounded-xl border border-[#E4E1DA] bg-white p-6">
            <h2 className="mb-5 text-sm font-semibold text-[#14201F]">
              {isManager ? "Pipeline" : "My pipeline"}
            </h2>
            <div className="space-y-3">
              {pipeline.map((p) => (
                <div key={p.name} className="flex items-center gap-4">
                  <div className="flex w-44 shrink-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: p.color || "#1F7A6B" }}
                    />
                    <span className="truncate text-sm text-[#14201F]">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-md bg-[#F4F2EE]">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${Math.max(3, (p.count / maxPipe) * 100)}%`,
                          background: (p.color || "#1F7A6B") + "cc",
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold text-[#14201F]">
                    {p.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[#E4E1DA] p-10 text-center">
            <p className="text-sm text-[#6C7A78]">
              No leads in the pipeline yet.
            </p>
            <Link
              href="/leads"
              className="mt-2 inline-block text-sm font-medium text-[#1F7A6B] hover:underline"
            >
              Go to leads
            </Link>
          </div>
        )}
      </div>
    </CrmShell>
  );
}
