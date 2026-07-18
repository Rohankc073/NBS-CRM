import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import { redirect } from "next/navigation";
import ColdClient from "./ColdClient";

const PAGE_SIZE = 25;

export default async function ColdPage({ searchParams }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const status = sp.status || "all";
  const search = (sp.q || "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const isManager = me.role === "super_admin" || me.role === "admin";

  const where = ["c.deleted_at IS NULL"];
  const paramsArr = [];

  if (!isManager) {
    paramsArr.push(me.id);
    where.push(`c.assigned_to = $${paramsArr.length}`);
  }
  if (status !== "all") {
    paramsArr.push(status);
    where.push(`c.status = $${paramsArr.length}`);
  }
  if (search) {
    const asNum = parseInt(search.replace("#", "").replace("C", ""), 10);
    if (
      !isNaN(asNum) &&
      String(asNum) === search.replace(/[#C]/gi, "").trim()
    ) {
      paramsArr.push(asNum);
      where.push(`c.ref_no = $${paramsArr.length}`);
    } else {
      paramsArr.push(`%${search}%`);
      where.push(
        `(c.name ILIKE $${paramsArr.length} OR c.phone ILIKE $${paramsArr.length} OR c.building ILIKE $${paramsArr.length})`,
      );
    }
  }
  const whereSql = where.join(" AND ");

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM cold_contacts c WHERE ${whereSql}`,
    paramsArr,
  );
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const contacts = await query(
    `SELECT c.id, c.ref_no, c.name, c.phone, c.mobile, c.building, c.unit_number,
            c.no_of_beds, c.sqft, c.status, c.next_follow_up_at, c.converted_lead_id,
            u.name AS agent_name
     FROM cold_contacts c
     LEFT JOIN users u ON u.id = c.assigned_to
     WHERE ${whereSql}
     ORDER BY c.created_at DESC, c.ref_no DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    paramsArr,
  );

  const scope = isManager ? "" : "AND c.assigned_to = $1";
  const scopeParams = isManager ? [] : [me.id];
  const counts = await queryOne(
    `SELECT
       COUNT(*)::int AS all,
       COUNT(*) FILTER (WHERE c.status = 'New')::int AS new,
       COUNT(*) FILTER (WHERE c.status = 'Contacted')::int AS contacted,
       COUNT(*) FILTER (WHERE c.status = 'Interested')::int AS interested,
       COUNT(*) FILTER (WHERE c.status = 'Callback')::int AS callback
     FROM cold_contacts c WHERE c.deleted_at IS NULL ${scope}`,
    scopeParams,
  );

  const agents = isManager
    ? await query(
        `SELECT id, name FROM users
         WHERE role IN ('sales_agent','telecaller') AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY name`,
      )
    : [];

  return (
    <CrmShell user={me} title="Cold Calling">
      <ColdClient
        initial={contacts}
        canManage={isManager}
        agents={agents}
        page={page}
        totalPages={totalPages}
        total={total}
        status={status}
        search={search}
        counts={counts}
      />
    </CrmShell>
  );
}
