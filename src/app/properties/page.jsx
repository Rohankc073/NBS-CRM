import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { canApproveProperty, canCreateProperty } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import { redirect } from "next/navigation";
import PropertiesClient from "./PropertiesClient";

const PAGE_SIZE = 24;

export default async function PropertiesPage({ searchParams }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isReviewer = canApproveProperty(me);
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const status = sp.status || "all";
  const search = (sp.q || "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  // Build the WHERE clause from filters. Every condition is a param —
  // never string-concatenated — so this is injection-safe.
  const where = ["p.deleted_at IS NULL"];
  const params = [];

  // Non-reviewers only see approved + their own.
  if (!isReviewer) {
    params.push(me.id);
    where.push(
      `(p.approval_status = 'approved' OR p.created_by = $${params.length})`,
    );
  }

  if (status !== "all") {
    params.push(status);
    where.push(`p.approval_status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(p.name ILIKE $${params.length} OR p.community ILIKE $${params.length})`,
    );
  }

  const whereSql = where.join(" AND ");

  // Total count — cheap, drives the page numbers. Runs in the DB.
  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM properties p WHERE ${whereSql}`,
    params,
  );
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Only ever fetch ONE page. LIMIT + OFFSET at the end.
  const properties = await query(
    `SELECT p.id, p.name, p.price, p.community, p.approval_status,
            p.availability, p.bedrooms, p.bathrooms, p.created_by,
            t.name AS type_name, u.name AS created_by_name,
            img.file_path AS thumb
     FROM properties p
     LEFT JOIN property_types t ON t.id = p.type_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN LATERAL (
       SELECT file_path FROM property_media
       WHERE property_id = p.id AND kind = 'image'
       ORDER BY sort_order, created_at LIMIT 1
     ) img ON true
     WHERE ${whereSql}
     ORDER BY CASE WHEN p.approval_status = 'pending' THEN 0 ELSE 1 END,
              p.created_at DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    params,
  );

  return (
    <CrmShell user={me}>
      <PropertiesClient
        initial={properties}
        canCreate={canCreateProperty(me)}
        canReview={isReviewer}
        page={page}
        totalPages={totalPages}
        total={total}
        status={status}
        search={search}
      />
    </CrmShell>
  );
}
