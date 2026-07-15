import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { ROLE_LABEL } from "@/server/authz/policy";
import CrmShell from "@/components/CrmShell";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <CrmShell user={user}>
      <div className="p-8">
        <div className="border-b border-[#E4E1DA] pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {user.name} · {ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>
    </CrmShell>
  );
}