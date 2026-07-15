"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh(); // drops the cached server-rendered page
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="text-sm text-[#6C7A78] hover:text-[#14201F] disabled:opacity-40"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
