"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Which roles see which link. Mirrors the policy functions — kept in sync
// by hand for now since this runs on the client.
const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/leads",
    label: "Leads",
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/properties",
    label: "Properties",
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  { href: "/users", label: "Users", roles: ["super_admin", "admin"] },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = NAV.filter((n) => n.roles.includes(user.role));

  const ROLE_LABEL = {
    super_admin: "Super Admin",
    admin: "Admin",
    sales_agent: "Sales Agent",
    telecaller: "Telecaller",
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[#E4E1DA] bg-[#0F1C1E] text-[#C9D6D3]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-lg font-semibold tracking-tight text-[#FBFAF7]">
          NBS
        </div>
        <div className="text-[11px] uppercase tracking-[0.15em] text-[#5C7C77]">
          CRM
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        {links.map((l) => {
          const active =
            pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "block rounded-md px-3 py-2 text-sm transition " +
                (active
                  ? "bg-[#1F7A6B] text-white"
                  : "text-[#C9D6D3] hover:bg-white/5")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="text-sm text-[#FBFAF7]">{user.name}</div>
        <div className="text-[11px] text-[#5C7C77]">
          {ROLE_LABEL[user.role]}
        </div>
        <button
          onClick={signOut}
          className="mt-3 text-xs text-[#7FA9A0] hover:text-[#FBFAF7]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
