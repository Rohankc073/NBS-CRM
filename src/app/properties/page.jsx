import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { canCreateProperty, canApproveProperty } from "@/server/authz/policy";
import { query } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import PropertiesClient from "./PropertiesClient";

// Grabs one image per property via a LATERAL join — the first by sort order.
// This is why the card can show a thumbnail without a second query per row.
const SELECT = `
  SELECT p.id, p.name, p.price, p.community, p.approval_status,
         p.availability, p.bedrooms, p.bathrooms, p.created_by,
         t.name AS type_name, u.name AS created_by_name,
         img.file_path AS thumb
  FROM properties p
  LEFT JOIN property_types t ON t.id = p.type_id
  LEFT JOIN users u ON u.id = p.created_by
  LEFT JOIN LATERAL (
    SELECT file_path FROM property_media
    WHERE property_id = p.id AND kind = 'image'
    ORDER BY sort_order, created_at
    LIMIT 1
  ) img ON true
  WHERE p.deleted_at IS NULL
`;

export default async function PropertiesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const isReviewer = canApproveProperty(me);

  const properties = isReviewer
    ? await query(
        `${SELECT}
         ORDER BY CASE WHEN p.approval_status = 'pending' THEN 0 ELSE 1 END,
                  p.created_at DESC`,
      )
    : await query(
        `${SELECT}
           AND (p.approval_status = 'approved' OR p.created_by = $1)
         ORDER BY p.created_at DESC`,
        [me.id],
      );

  return (
    <CrmShell user={me}>
      <PropertiesClient
        initial={properties}
        canCreate={canCreateProperty(me)}
        canReview={isReviewer}
      />
    </CrmShell>
  );
}