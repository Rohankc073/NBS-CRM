import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { canCreateProperty, autoApprovesProperty } from "@/server/authz/policy";
import { query } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import PropertyForm from "./PropertyForm";

export default async function NewPropertyPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canCreateProperty(me)) redirect("/dashboard");

  const types = await query(
    `SELECT id, name FROM property_types WHERE is_active = TRUE ORDER BY sort_order`,
  );
  const agents = await query(
    `SELECT id, name FROM users
     WHERE role IN ('sales_agent','admin','super_admin') AND deleted_at IS NULL
     ORDER BY name`,
  );

  const willAutoApprove = autoApprovesProperty(me);

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/properties" className="text-xs text-[#6C7A78] hover:text-[#14201F]">
            ← Properties
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#14201F]">
            Add property
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {willAutoApprove
              ? "This listing goes live as soon as you save it."
              : "This listing will be sent for review before it goes live."}
          </p>

          <PropertyForm types={types} agents={agents} />
        </div>
      </div>
    </CrmShell>
  );
}