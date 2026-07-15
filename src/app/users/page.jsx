import { getCurrentUser } from "@/server/auth/session";
import { canViewUsers, canManageUsers } from "@/server/authz/policy";
import { query } from "@/server/db";
import Link from "next/link";
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

  // Tells the client whether to render the Add / Remove controls.
  const canManage = canManageUsers(me);

  return (
    <div className="min-h-screen bg-[#FBFAF7] p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="text-xs text-[#6C7A78] hover:text-[#14201F]"
        >
          ← Dashboard
        </Link>

        <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#14201F]">
          Users
        </h1>
        <p className="mt-1 text-sm text-[#6C7A78]">
          {canManage
            ? "Accounts you create here can sign in immediately."
            : "You can view the team here. Contact a Super Admin to make changes."}
        </p>

        <UsersClient initialUsers={users} canManage={canManage} />
      </div>
    </div>
  );
}