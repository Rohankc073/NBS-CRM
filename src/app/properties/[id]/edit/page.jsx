import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { canApproveProperty } from "@/server/authz/policy";
import { query, queryOne } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import EditPropertyForm from "./EditPropertyForm";

export default async function EditPropertyPage({ params }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // Only Admin + Super Admin can edit. An agent hitting this URL directly
  // is bounced — the real gate, not a hidden button.
  if (!canApproveProperty(me)) redirect("/properties");

  const { id } = await params;

  const property = await queryOne(
    `SELECT * FROM properties WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!property) notFound();

  // Dropdown data + current media, loaded server-side.
  const types = await query(
    `SELECT id, name FROM property_types WHERE is_active = TRUE ORDER BY sort_order`,
  );
  const agents = await query(
    `SELECT id, name FROM users
     WHERE role IN ('sales_agent','admin','super_admin') AND deleted_at IS NULL
     ORDER BY name`,
  );
  const media = await query(
    `SELECT id, kind, file_path, original_name FROM property_media
     WHERE property_id = $1 ORDER BY kind, sort_order`,
    [id],
  );

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
            Edit property
          </h1>
          <EditPropertyForm
            property={property}
            types={types}
            agents={agents}
            existingMedia={media}
          />
        </div>
      </div>
    </CrmShell>
  );
}