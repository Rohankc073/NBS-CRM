"use client";

import { IBM_Plex_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building2 } from "lucide-react";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

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

  const fieldStyle = {
    background: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.16)",
    color: "#FFFFFF",
  };
  const fieldCls =
    "w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition-all duration-200 " +
    "focus:border-[#3FA391] focus:ring-4 focus:ring-[#1F7A6B]/25";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A1514] font-sans">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .font-sans { font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-14px, -18px); } }
        @keyframes drift2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(16px, 14px); } }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .rise-in { animation: riseIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .drift-a { animation: drift 14s ease-in-out infinite; }
        .drift-b { animation: drift2 17s ease-in-out infinite; }
        .shimmer { animation: shimmer 3.5s ease-in-out infinite; }
        .login-field::placeholder { color: rgba(255,255,255,0.35); }
        .login-icon-btn { color: rgba(255,255,255,0.55); }
        .login-icon-btn:hover { color: #ffffff; }
      `}</style>

      {/* ---------------- Immersive background ---------------- */}
      <div className="absolute inset-0">
        {/* base gradient, dusk over the marina */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #0A1514 0%, #0F221F 38%, #1A3530 68%, #2A4C3F 100%)",
          }}
        />
        {/* warm horizon glow */}
        <div
          className="drift-a absolute left-1/2 top-[62%] h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(200,118,63,0.35) 0%, transparent 70%)" }}
        />
        {/* emerald glow, upper left */}
        <div
          className="drift-b absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(63,163,145,0.4) 0%, transparent 70%)" }}
        />

        {/* skyline silhouette */}
        <svg
          className="absolute bottom-0 left-0 h-[46%] w-full opacity-90"
          viewBox="0 0 1600 420"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <g fill="#07100F">
            <rect x="0" y="220" width="60" height="200" />
            <rect x="70" y="160" width="46" height="260" />
            <rect x="130" y="240" width="70" height="180" />
            <rect x="215" y="120" width="40" height="300" />
            <polygon points="235,60 255,120 215,120" />
            <rect x="270" y="200" width="55" height="220" />
            <rect x="340" y="90" width="34" height="330" />
            <rect x="390" y="180" width="60" height="240" />
            <rect x="465" y="40" width="30" height="380" />
            <rect x="510" y="150" width="65" height="270" />
            <rect x="590" y="220" width="45" height="200" />
            <rect x="650" y="10" width="26" height="410" />
            <circle cx="663" cy="4" r="5" />
            <rect x="695" y="170" width="70" height="250" />
            <rect x="780" y="100" width="38" height="320" />
            <rect x="835" y="230" width="55" height="190" />
            <rect x="905" y="60" width="32" height="360" />
            <rect x="955" y="190" width="66" height="230" />
            <rect x="1035" y="140" width="40" height="280" />
            <rect x="1090" y="0" width="24" height="420" />
            <polygon points="1102,-40 1116,0 1090,0" />
            <rect x="1130" y="210" width="58" height="210" />
            <rect x="1200" y="120" width="36" height="300" />
            <rect x="1250" y="250" width="70" height="170" />
            <rect x="1330" y="70" width="30" height="350" />
            <rect x="1375" y="180" width="60" height="240" />
            <rect x="1450" y="230" width="50" height="190" />
            <rect x="1515" y="150" width="40" height="270" />
            <rect x="1565" y="260" width="35" height="160" />
          </g>
          {/* window lights */}
          <g fill="#F0C177" opacity="0.55">
            <rect x="222" y="140" width="4" height="6" />
            <rect x="222" y="160" width="4" height="6" />
            <rect x="244" y="150" width="4" height="6" />
            <rect x="347" y="120" width="4" height="6" />
            <rect x="347" y="150" width="4" height="6" />
            <rect x="359" y="180" width="4" height="6" />
            <rect x="472" y="80" width="4" height="6" />
            <rect x="472" y="120" width="4" height="6" />
            <rect x="484" y="160" width="4" height="6" />
            <rect x="912" y="100" width="4" height="6" />
            <rect x="912" y="140" width="4" height="6" />
            <rect x="924" y="180" width="4" height="6" />
            <rect x="1097" y="40" width="4" height="6" />
            <rect x="1097" y="80" width="4" height="6" />
            <rect x="1109" y="120" width="4" height="6" />
            <rect x="1337" y="110" width="4" height="6" />
            <rect x="1337" y="150" width="4" height="6" />
            <rect x="1349" y="190" width="4" height="6" />
          </g>
        </svg>

        {/* subtle grid overlay for texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* fine star-like sparkles */}
        <div className="absolute inset-0">
          {[
            [8, 12], [22, 6], [35, 18], [52, 8], [68, 14], [81, 5], [92, 20], [15, 28], [46, 24], [76, 26],
          ].map(([x, y], i) => (
            <span
              key={i}
              className="shimmer absolute h-[3px] w-[3px] rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </div>
      </div>

      {/* ---------------- Foreground content ---------------- */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
        {/* Brand mark */}
        <div className="rise-in mb-8 flex flex-col items-center text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl backdrop-blur-sm"
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.07)",
              color: "#7FE3CE",
            }}
          >
            <Building2 size={20} />
          </span>
          <div className="font-serif text-3xl font-semibold tracking-tight text-white">NBS</div>
          <div
            className={`${mono.className} mt-1.5 text-[10px] uppercase tracking-[0.28em]`}
            style={{ color: "#8FB5AC" }}
          >
            Real Estate Brokerage
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rise-in w-full max-w-sm rounded-[28px] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          style={{
            animationDelay: "0.08s",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.07)",
          }}
        >
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            Sign in with your NBS work account.
          </p>

          <div className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="you@nbsrealestate.com"
                  style={fieldStyle}
                  className={fieldCls + " login-field pl-11"}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#7FE3CE" }}>
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="••••••••••"
                  style={fieldStyle}
                  className={fieldCls + " login-field pl-11 pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                  className="login-icon-btn absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Errors state what happened. They don't apologise. */}
            {error && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ border: "1px solid rgba(232,145,122,0.35)", background: "rgba(160,58,43,0.18)" }}
              >
                <p className="text-sm" style={{ color: "#F3B8A8" }}>{error}</p>
              </div>
            )}

            <button
              onClick={signIn}
              disabled={busy || !form.email || !form.password}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1F7A6B] to-[#2E9683] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(31,122,107,0.6)] transition-all duration-200 hover:shadow-[0_10px_30px_-6px_rgba(31,122,107,0.75)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy && (
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="rise-in mt-8 flex flex-col items-center gap-2 text-center" style={{ animationDelay: "0.16s" }}>
          <p className={`${mono.className} text-[11px]`} style={{ color: "rgba(255,255,255,0.35)" }}>
            Accounts are issued by your administrator.
          </p>
          <p className={`${mono.className} text-[10px] tracking-wide`} style={{ color: "rgba(255,255,255,0.25)" }}>
            ORN 00000 &nbsp;·&nbsp; DUBAI, UAE
          </p>
        </div>
      </div>
    </div>
  );
}