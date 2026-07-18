"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  X,
  Sheet as SheetIcon,
  Trash2,
  ExternalLink,
} from "lucide-react";

const fieldCls =
  "w-full rounded-lg border border-[#E4E1DA] bg-white px-3.5 py-2.5 text-sm text-[#14201F] outline-none transition-all duration-200 placeholder:text-[#B7BFBD] focus:border-[#1F7A6B] focus:ring-4 focus:ring-[#1F7A6B]/10";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]";

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
    <div className="p-8 font-sans">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .font-sans { font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rise-in { animation: riseIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#E7E3D9] pb-6">
        <div>
          <Link
            href="/cold"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C9795] transition hover:text-[#14201F]"
          >
            <ArrowLeft size={13} />
            Back to cold calling
          </Link>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F7A6B]/10 text-[#1F7A6B]">
              <SheetIcon size={15} />
            </span>
            <h1 className="font-serif text-[26px] font-semibold tracking-tight text-[#14201F]">
              Cold-calling sheets
            </h1>
          </div>
          <p className="mt-1.5 text-[13px] text-[#8C9795]">
            Connect Google Sheets of contact lists. New rows import
            automatically; duplicates are skipped.
          </p>
        </div>
        <div className="flex gap-2">
          {sheets.length ? (
            <button
              onClick={syncAll}
              disabled={syncing === "all"}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] shadow-sm transition hover:border-[#1F7A6B] hover:text-[#1F7A6B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={14} className={syncing === "all" ? "animate-spin" : ""} />
              {syncing === "all" ? "Syncing…" : "Sync all now"}
            </button>
          ) : null}
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] shadow-sm transition hover:bg-[#16292C] hover:shadow-md"
          >
            {open ? <X size={15} /> : <Plus size={15} />}
            {open ? "Cancel" : "Connect a sheet"}
          </button>
        </div>
      </div>

      {/* Connect form */}
      {open ? (
        <div className="rise-in mb-6 overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
          <div className="border-b border-[#F0EEE6] px-6 py-5">
            <h2 className="font-serif text-lg font-semibold text-[#14201F]">Connect a sheet</h2>
          </div>
          <div className="px-6 py-6">
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
                <label className={labelCls}>Batch name (stamped on contacts)</label>
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
                <p className="mt-1.5 text-xs text-[#8C9795]">
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
              <div className="mt-4 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
                <p className="text-sm text-[#A03A2B]">{error}</p>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end border-t border-[#F0EEE6] pt-5">
              <button
                onClick={addSheet}
                disabled={busy || !form.name || !form.url}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Connecting…" : "Connect & save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error && !open ? (
        <div className="mb-6 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
          <p className="text-sm text-[#A03A2B]">{error}</p>
        </div>
      ) : null}

      {/* Sheets list */}
      {sheets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8D3C6] bg-white/60 py-20 text-center">
          <SheetIcon className="mx-auto h-8 w-8 text-[#D8D3C6]" />
          <p className="mt-3 text-sm text-[#8C9795]">No sheets connected yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sheets.map((s) => (
            <div
              key={s.id}
              className="rise-in flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7E3D9] bg-white p-5 shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)] transition hover:border-[#1F7A6B]/30"
            >
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F1EB] text-[#7B8683]">
                  <SheetIcon size={15} />
                </span>
                <div className="min-w-0">
                  <div className="font-serif text-[15px] font-semibold text-[#14201F]">{s.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#8C9795]">
                    <span className="rounded-full bg-[#F3F1EB] px-2 py-0.5 font-medium text-[#6C7A78]">
                      {s.batch || "No batch"}
                    </span>
                    {s.auto_assign ? (
                      <span className="rounded-full bg-[#1F7A6B]/10 px-2 py-0.5 font-medium text-[#186459]">
                        auto-assign
                      </span>
                    ) : null}
                    <span>{s.last_row} rows synced</span>
                    <span className="text-[#D8D3C6]">·</span>
                    <span>last: {fmt(s.last_synced_at)}</span>
                  </div>
                  {s.last_result ? (
                    <div className="mt-1 text-xs text-[#AAB3B0]">{s.last_result}</div>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => syncOne(s.id)}
                  disabled={syncing === s.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1F7A6B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1a6659] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw size={12} className={syncing === s.id ? "animate-spin" : ""} />
                  {syncing === s.id ? "Syncing…" : "Sync now"}
                </button>
                <button
                  onClick={() => remove(s.id, s.name)}
                  className="inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-1.5 text-xs font-medium text-[#8C9795] transition hover:border-[#A03A2B]/30 hover:text-[#A03A2B]"
                >
                  <Trash2 size={12} />
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