"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1.5 block text-xs font-medium text-[#14201F]";

/* ---- inline icons (no external deps) ---- */
const IconArrowLeft = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6 6m-6-6l6-6" />
  </svg>
);
const IconSheet = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 4v16" />
  </svg>
);
const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.836 5a8.001 8.001 0 01-15.356 2M20 20v-5h-.581m0 0a8.003 8.003 0 00-15.357-2" />
  </svg>
);
const IconTrash = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9.5 7V5.2c0-.66.55-1.2 1.2-1.2h2.6c.66 0 1.2.54 1.2 1.2V7m-8 0l.7 12.1a1.6 1.6 0 001.6 1.5h6.4a1.6 1.6 0 001.6-1.5L18.5 7" />
  </svg>
);
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
);
const IconChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/* ---- status dot: reads recency + last_result heuristically ---- */
function statusTone(s) {
  if (!s.last_synced_at) return { dot: "bg-[#B9B2A3]", label: "Not synced yet" };
  const failed = s.last_result && /error|fail/i.test(s.last_result);
  if (failed) return { dot: "bg-[#A03A2B]", label: "Last sync had a problem" };
  return { dot: "bg-[#1F7A6B]", label: "Synced" };
}

export default function SheetsClient({ initial, sources }) {
  const router = useRouter();
  const [sheets, setSheets] = useState(initial);
  const [form, setForm] = useState({ name: "", url: "", campaign: "", source_id: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null); // { tone: 'good' | 'bad', title, lines: [] }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const notify = (tone, title, lines = []) => setToast({ tone, title, lines });

  async function addSheet() {
    setError(""); setBusy(true);
    const res = await fetch("/api/leads/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setForm({ name: "", url: "", campaign: "", source_id: "" });
    setOpen(false);
    notify("good", `Connected "${form.name}"`);
    router.refresh();
  }

  async function syncOne(id, name) {
    setSyncing(id); setError("");
    const res = await fetch(`/api/leads/sheets/sync?id=${id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(null);
    if (!res.ok) return notify("bad", `Couldn't sync "${name}"`, [data.error || "Sync failed"]);
    notify("good", `Synced "${name}"`, [data.result?.message || "Sync complete"]);
    router.refresh();
  }

  async function syncAll() {
    setSyncing("all"); setError("");
    const res = await fetch(`/api/leads/sheets/sync`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSyncing(null);
    if (!res.ok) return notify("bad", "Sync failed", [data.error || "Something went wrong"]);
    const lines = (data.results || []).map((r) => `${r.sheet}: ${r.message || r.error}`);
    notify("good", "Synced all sheets", lines.length ? lines : ["Sync complete"]);
    router.refresh();
  }

  async function remove(id, name) {
    if (!confirm(`Remove "${name}"? Leads already imported stay; this just stops syncing.`)) return;
    const res = await fetch(`/api/leads/sheets/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSheets(sheets.filter((s) => s.id !== id));
      notify("good", `Removed "${name}"`);
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never";

  return (
    <div className="p-8">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4E1DA] pb-5">
        <div>
          <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-[#6C7A78] transition hover:text-[#14201F]">
            <IconArrowLeft className="h-3.5 w-3.5" />
            Back to leads
          </Link>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F1C1E] text-[#FBFAF7]">
              <IconSheet className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">Google Sheets</h1>
            {sheets.length > 0 && (
              <span className="rounded-full bg-[#EFEDE6] px-2 py-0.5 text-xs font-medium text-[#6C7A78]">
                {sheets.length} connected
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-[#6C7A78]">
            Connect campaign sheets. New leads import automatically; duplicates are skipped.
          </p>
        </div>
        <div className="flex gap-2">
          {sheets.length ? (
            <button onClick={syncAll} disabled={syncing === "all"}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] transition hover:border-[#1F7A6B] disabled:cursor-not-allowed disabled:opacity-40">
              <IconRefresh className={`h-3.5 w-3.5 ${syncing === "all" ? "animate-spin" : ""}`} />
              {syncing === "all" ? "Syncing..." : "Sync all now"}
            </button>
          ) : null}
          <button onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] transition hover:bg-[#16292C]">
            {open ? <IconClose className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
            {open ? "Cancel" : "Connect a sheet"}
          </button>
        </div>
      </div>

      {/* connect form — animated collapse, no extra deps */}
      <div
        style={{ maxHeight: open ? 480 : 0, opacity: open ? 1 : 0, marginTop: open ? 20 : 0 }}
        className="overflow-hidden transition-all duration-300 ease-out"
      >
        <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Label</label>
              <input className={fieldCls} value={form.name} onChange={set("name")} placeholder="e.g. Downtown Q1 Campaign" />
            </div>
            <div>
              <label className={labelCls}>Campaign name (stamped on leads)</label>
              <input className={fieldCls} value={form.campaign} onChange={set("campaign")} placeholder="e.g. Downtown Q1 2026" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Google Sheet URL</label>
              <input className={fieldCls} value={form.url} onChange={set("url")}
                placeholder="https://docs.google.com/spreadsheets/d/..." />
              <p className="mt-1.5 text-xs text-[#6C7A78]">
                Paste the full URL. Make sure the sheet is shared (Viewer) with the service account email.
              </p>
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <div className="relative">
                <select className={`${fieldCls} appearance-none pr-8`} value={form.source_id} onChange={set("source_id")}>
                  <option value="">Select source...</option>
                  {sources.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA6A4]" />
              </div>
            </div>
          </div>
          {error ? <p className="mt-3 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p> : null}
          <button onClick={addSheet} disabled={busy || !form.name || !form.url}
            className="mt-4 rounded-md bg-[#1F7A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1a6659] disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "Connecting..." : "Connect & save"}
          </button>
        </div>
      </div>

      {error && !open ? <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p> : null}

      {/* list / empty state */}
      {sheets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFEDE6] text-[#9AA6A4]">
            <IconSheet className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-[#14201F]">No sheets connected yet</p>
          <p className="mt-1 max-w-xs text-sm text-[#6C7A78]">
            Connect a campaign sheet and new leads will import automatically.
          </p>
          <button onClick={() => setOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] transition hover:bg-[#16292C]">
            <IconPlus className="h-3.5 w-3.5" />
            Connect a sheet
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {sheets.map((s) => {
            const tone = statusTone(s);
            return (
              <div key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E4E1DA] bg-white p-4 transition hover:border-[#D8D3C8] hover:shadow-sm">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} title={tone.label} />
                  <div className="min-w-0">
                    <div className="font-medium text-[#14201F]">{s.name}</div>
                    <div className="mt-0.5 text-xs text-[#6C7A78]">
                      {s.source_name || "No source"}{s.campaign ? ` · ${s.campaign}` : ""} · {s.last_row} rows synced · last {fmt(s.last_synced_at)}
                    </div>
                    {s.last_result ? <div className="mt-0.5 text-xs text-[#9AA6A4]">{s.last_result}</div> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => syncOne(s.id, s.name)} disabled={syncing === s.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#1F7A6B] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1a6659] disabled:cursor-not-allowed disabled:opacity-40">
                    <IconRefresh className={`h-3 w-3 ${syncing === s.id ? "animate-spin" : ""}`} />
                    {syncing === s.id ? "Syncing..." : "Sync now"}
                  </button>
                  <button onClick={() => remove(s.id, s.name)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#6C7A78] transition hover:bg-[#FBEEEC] hover:text-[#A03A2B]">
                    <IconTrash className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* toast */}
      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-lg border bg-white p-4 shadow-lg ${
            toast.tone === "bad" ? "border-[#EAC4BC]" : "border-[#CFE3DD]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-medium ${toast.tone === "bad" ? "text-[#A03A2B]" : "text-[#14201F]"}`}>
                {toast.title}
              </p>
              {toast.lines?.length ? (
                <div className="mt-1 space-y-0.5">
                  {toast.lines.map((l, i) => (
                    <p key={i} className="text-xs text-[#6C7A78]">{l}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 text-[#9AA6A4] transition hover:text-[#14201F]">
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}