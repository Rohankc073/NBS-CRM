import { getCurrentUser } from "@/server/auth/session";
import { canManageUsers, ROLE_LABEL } from "@/server/authz/policy";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7] p-8">
      <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {user.name} · {ROLE_LABEL[user.role]}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {canManageUsers(user) ? (
            <Link
              href="/users"
              className="rounded-md bg-[#0F1C1E] px-3 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C]"
            >
              Manage users
            </Link>
          ) : null}

          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
