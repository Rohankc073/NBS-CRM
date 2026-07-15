"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // On load, ask the server whether setup is still allowed. If a Super
  // Admin already exists, this page has no business rendering.
  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) =>
        d.needsSetup ? setChecking(false) : router.replace("/login"),
      )
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit() {
    setError("");
    setSaving(true);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) return setError(data.error);

    router.replace("/login");
  }

  if (checking)
    return <div className="p-8 text-sm text-neutral-500">Checking…</div>;

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-lg p-8">
        <h1 className="text-lg font-semibold text-neutral-900">
          Create Super Admin
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          One-time setup. This page closes permanently once the first account
          exists.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Full name
            </label>
            <input
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Minimum 10 characters.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
