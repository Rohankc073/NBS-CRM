"use client";

import { IBM_Plex_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError("");
    setBusy(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setBusy(false);
    if (!res.ok) return setError(data.error);

    // Cookies are already set by the server. Nothing to store client-side —
    // that's the point of httpOnly.
    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#FBFAF7]">
      {/* Master plan. A brokerage's world is parcels and permits — not gradients. */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-[#0F1C1E] p-12 overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.18]"
          viewBox="0 0 600 800"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="#7FA9A0" strokeWidth="1">
            <path d="M60 80h480M60 240h480M60 400h480M60 560h480M60 720h480" />
            <path d="M60 80v640M220 80v640M380 80v640M540 80v640" />
            <path
              d="M140 80v640M300 240v320M460 80v640"
              strokeDasharray="3 5"
            />
            <path
              d="M60 160h160M380 320h160M220 480h160M60 640h320"
              strokeDasharray="3 5"
            />
          </g>
          {/* The live plot. One parcel, lit. */}
          <rect
            x="220"
            y="240"
            width="160"
            height="160"
            fill="#1F7A6B"
            fillOpacity="0.28"
          />
          <rect
            x="220"
            y="240"
            width="160"
            height="160"
            stroke="#3FA391"
            strokeWidth="1.5"
          />
        </svg>

        <div className="relative">
          <div className="text-[#FBFAF7] text-2xl font-semibold tracking-tight">
            NBS
          </div>
          <div
            className={`${mono.className} mt-1 text-[11px] uppercase tracking-[0.2em] text-[#7FA9A0]`}
          >
            Real Estate Brokerage
          </div>
        </div>

        <div className="relative">
          <p className="max-w-xs text-[#C9D6D3] text-sm leading-relaxed">
            Every lead, listing and call — in one place.
          </p>
          <div className={`${mono.className} mt-6 text-[11px] text-[#5C7C77]`}>
            ORN 00000 &nbsp;·&nbsp; DUBAI, UAE
          </div>
        </div>
      </aside>

      {/* Form. Deliberately quiet. */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[#14201F]">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-[#6C7A78]">
            Use your NBS work account.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#14201F] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className="w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2.5 text-sm text-[#14201F]
                           outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-[#14201F]"
                >
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-[#1F7A6B] hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                className="w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2.5 text-sm text-[#14201F]
                           outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20"
              />
            </div>

            {/* Errors state what happened. They don't apologise. */}
            {error && (
              <p className="border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
                {error}
              </p>
            )}

            <button
              onClick={signIn}
              disabled={busy || !form.email || !form.password}
              className="w-full rounded-md bg-[#0F1C1E] px-3 py-2.5 text-sm font-medium text-[#FBFAF7]
                         transition hover:bg-[#16292C] disabled:opacity-40 disabled:hover:bg-[#0F1C1E]"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <p className={`${mono.className} mt-10 text-[11px] text-[#9AA6A4]`}>
            Accounts are issued by your administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
