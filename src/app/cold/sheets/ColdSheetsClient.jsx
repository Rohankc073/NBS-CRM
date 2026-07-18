"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1.5 block text-xs font-medium text-[#14201F]";

export default function ColdSheetsClient({ initial }) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initial);
  const [form, setForm] = useState({
    name: "",
    url: "",
    batch: "",
    auto_assign: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [open, setOpen] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function addSheet() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/cold/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setForm({ name: "", url: "", batch: "", auto_assign: false });
    setOpen(false);
    router.refresh();
  }

  async function syncOne(id) {
    setSyncing(id);
    setError("");
    const res = await fetch(`/api/cold/sheets/sync?id=${id}`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setSyncing(null);
    if (!res.ok) return setError(data.error || "Sync failed");
    alert(data.result?.message || "Sync complete");
    router.refresh();
  }

  async function syncAll() {
    setSyncing("all");
    setError("");
    const res = await fetch(`/api/cold/sheets/sync`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(null);
    if (!res.ok) return setError(data.error || "Sync failed");
    const summary = (data.results || [])
      .map((r) => `${r.sheet}: ${r.message || r.error}`)
      .join("\n");
    alert(summary || "Sync complete");
    router.refresh();
  }

  async function remove(id, name) {
    if (
      !confirm(
        `Remove "${name}"? Contacts already imported stay; this just stops syncing.`,
      )
    )
      return;
    const res = await fetch(`/api/cold/sheets/${id}`, { method: "DELETE" });
    if (res.ok) setSheets(sheets.filter((s) => s.id !== id));
  }

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never";

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E1DA] pb-5">
        <div>
          <Link
            href="/cold"
            className="text-xs text-[#6C7A78] hover:text-[#14201F]"
          >
            Back to cold calling
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#14201F]">
            Cold-calling sheets
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            Connect Google Sheets of contact lists. New rows import
            automatically; duplicates are skipped.
          </p>
        </div>
        <div className="flex gap-2">
          {sheets.length ? (
            <button
              onClick={syncAll}
              disabled={syncing === "all"}
              className="rounded-md border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] hover:border-[#1F7A6B] disabled:opacity-40"
            >
              {syncing === "all" ? "Syncing..." : "Sync all now"}
            </button>
          ) : null}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C]"
          >
            {open ? "Cancel" : "Connect a sheet"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-5 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Label</label>
              <input
                className={fieldCls}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Marina Towers list"
              />
            </div>
            <div>
              <label className={labelCls}>
                Batch name (stamped on contacts)
              </label>
              <input
                className={fieldCls}
                value={form.batch}
                onChange={set("batch")}
                placeholder="e.g. Marina Towers"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Google Sheet URL</label>
              <input
                className={fieldCls}
                value={form.url}
                onChange={set("url")}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="mt-1 text-xs text-[#6C7A78]">
                Share the sheet (Viewer) with the service account email first.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#14201F]">
              <input
                type="checkbox"
                checked={form.auto_assign}
                onChange={(e) =>
                  setForm({ ...form, auto_assign: e.target.checked })
                }
                className="h-4 w-4 accent-[#1F7A6B]"
              />
              Auto-distribute to agents (round-robin)
            </label>
          </div>
          {error ? (
            <p className="mt-3 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
              {error}
            </p>
          ) : null}
          <button
            onClick={addSheet}
            disabled={busy || !form.name || !form.url}
            className="mt-4 rounded-md bg-[#1F7A6B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
          >
            {busy ? "Connecting..." : "Connect & save"}
          </button>
        </div>
      ) : null}

      {error && !open ? (
        <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
          {error}
        </p>
      ) : null}

      {sheets.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-[#6C7A78]">No sheets connected yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sheets.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E4E1DA] bg-white p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-[#14201F]">{s.name}</div>
                <div className="mt-0.5 text-xs text-[#6C7A78]">
                  {s.batch || "No batch"}
                  {s.auto_assign ? " - auto-assign" : ""} - {s.last_row} rows
                  synced - last: {fmt(s.last_synced_at)}
                </div>
                {s.last_result ? (
                  <div className="mt-0.5 text-xs text-[#9AA6A4]">
                    {s.last_result}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => syncOne(s.id)}
                  disabled={syncing === s.id}
                  className="rounded-md bg-[#1F7A6B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
                >
                  {syncing === s.id ? "Syncing..." : "Sync now"}
                </button>
                <button
                  onClick={() => remove(s.id, s.name)}
                  className="text-xs text-[#6C7A78] hover:text-[#A03A2B]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
