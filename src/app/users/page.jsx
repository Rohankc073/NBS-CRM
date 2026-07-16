import CrmShell from "@/components/CrmShell";
import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers, canViewUsers } from "@/server/authz/policy";
import { query } from "@/server/db";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // Admins can view the list; Super Admins can also manage it.
  // Anyone below Admin is bounced — enforced here, not by a hidden button.
  if (!canViewUsers(me)) redirect("/dashboard");

  const users = await query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );

  const canManage = canManageUsers(me);

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <div className="mx-auto max-w-5xl">
          <div className="border-b border-[#E4E1DA] pb-5">
            <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
              Users
            </h1>
            <p className="mt-1 text-sm text-[#6C7A78]">
              {canManage
                ? "Create, edit, and manage team accounts."
                : "View the team here. Contact a Super Admin to make changes."}
            </p>
          </div>

          <UsersClient initialUsers={users} canManage={canManage} />
        </div>
      </div>
    </CrmShell>
  );
}
