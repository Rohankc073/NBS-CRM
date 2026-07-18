"use client";

import {
  Building2,
  LayoutDashboard,
  LogOut,
  PhoneCall,
  UserCog,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Which roles see which link.
const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Users2,
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/cold",
    label: "Cold Calling",
    icon: PhoneCall,
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/properties",
    label: "Properties",
    icon: Building2,
    roles: ["super_admin", "admin", "sales_agent", "telecaller"],
  },
  {
    href: "/users",
    label: "Users",
    icon: UserCog,
    roles: ["super_admin", "admin"],
  },
];

const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales_agent: "Sales Agent",
  telecaller: "Telecaller",
};

function initials(name) {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#0F1C1E] text-[#C9D6D3]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F7A6B] text-sm font-bold text-white">
          N
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight tracking-tight text-[#FBFAF7]">
            NBS Real Estate
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5C7C77]">
            CRM
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {links.map((l) => {
          const active =
            pathname === l.href || pathname.startsWith(l.href + "/");
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition " +
                (active
                  ? "bg-white/10 text-white"
                  : "text-[#9FB4B0] hover:bg-white/5 hover:text-[#E8F0EE]")
              }
            >
              {/* Active accent bar */}
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-[#1F7A6B]" />
              ) : null}
              <Icon
                size={18}
                className={active ? "text-[#3FA08F]" : "text-[#6C8A85]"}
                strokeWidth={2}
              />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F7A6B] text-xs font-semibold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[#FBFAF7]">
              {user.name}
            </div>
            <div className="truncate text-[11px] text-[#5C7C77]">
              {ROLE_LABEL[user.role]}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#7FA9A0] transition hover:bg-white/5 hover:text-[#FBFAF7]"
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
