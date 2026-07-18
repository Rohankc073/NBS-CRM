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
  // Anyone below Admin is bounced - enforced here, not by a hidden button.
  if (!canViewUsers(me)) redirect("/dashboard");

  const users = await query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );

  const canManage = canManageUsers(me);

  return (
    <CrmShell user={me} title="Users">
      <div className="p-8">
        <div className="mx-auto max-w-5xl">
          <UsersClient initialUsers={users} canManage={canManage} />
        </div>
      </div>
    </CrmShell>
  );
}
