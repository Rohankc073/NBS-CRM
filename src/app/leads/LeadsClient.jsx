"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const fieldCls =
  "w-full rounded-lg border border-[#E4E1DA] bg-white px-3.5 py-2.5 text-sm text-[#14201F] outline-none transition-all duration-200 placeholder:text-[#B7BFBD] focus:border-[#1F7A6B] focus:ring-4 focus:ring-[#1F7A6B]/10";

const AVATAR_COLORS = [
  "#1F7A6B", "#2563EB", "#7C3AED", "#C58A12", "#A03A2B",
  "#0891B2", "#BE185D", "#4338CA", "#15803D", "#B45309",
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name) {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

const AED = (n) => "AED " + Number(n).toLocaleString("en-AE");
function budgetLabel(min, max) {
  if (min && max) return `${AED(min)} - ${AED(max)}`;
  if (min) return `From ${AED(min)}`;
  if (max) return `Up to ${AED(max)}`;
  return null;
}

/* ---- inline icons (purely decorative, no external deps) ---- */
const IconSearch = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
  </svg>
);
const IconChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);
const IconChevronLeft = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
  </svg>
);
const IconChevronRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
  </svg>
);
const IconSheet = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 4v16" />
  </svg>
);
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
);
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconUpload = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 16.5v2A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5v-2" />
  </svg>
);
const IconDownload = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l4.5-4.5M12 15L7.5 10.5M5 16.5v2A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5v-2" />
  </svg>
);
const IconClock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
  </svg>
);
const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <circle cx="9" cy="8" r="3" />
    <path strokeLinecap="round" d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="8.5" r="2.2" />
    <path strokeLinecap="round" d="M15.5 14.2c2.3.2 4 1.9 4 4.3" />
  </svg>
);
const IconFilter = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10.5 18h3" />
  </svg>
);
const IconInbox = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13l2.2-7.4A2 2 0 018.1 4h7.8a2 2 0 011.9 1.6L20 13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4.5l1 2.5h5l1-2.5H20v4.5a2 2 0 01-2 2H6a2 2 0 01-2-2V13z" />
  </svg>
);

/** wraps a native select with a custom chevron; same value/onChange, purely visual */
function SelectWrap({ className = "", children, ...rest }) {
  return (
    <div className="relative">
      <select {...rest} className={`${fieldCls} appearance-none pr-9 ${className}`}>
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAB3B0]" />
    </div>
  );
}

export default function LeadsClient({
  initial, statuses, sources, canImport, agents = [],
  page, totalPages, total, statusId, search,
  counts, statusIdByName,
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState(initial);
  const [searchInput, setSearchInput] = useState(search || "");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [campaign, setCampaign] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Bulk assign
  const [selected, setSelected] = useState(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  useEffect(() => {
    setItems(initial);
    setSelected(new Set());
    setSelectAllMatching(false);
  }, [initial]);
  useEffect(() => { setSearchInput(search || ""); }, [search]);

  function go(overrides) {
    const next = new URLSearchParams(params.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    });
    router.push(`/leads?${next.toString()}`);
  }

  useEffect(() => {
    const current = search || "";
    if (searchInput === current) return;
    const t = setTimeout(() => go({ q: searchInput, page: 1 }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  async function bulkUpload() {
    if (!bulkFile) return;
    if (!campaign.trim()) { setBulkResult({ ok: false, error: "Enter a campaign name." }); return; }
    setBulkBusy(true);
    setBulkResult(null);
    const fd = new FormData();
    fd.append("file", bulkFile);
    fd.append("source_id", sourceId);
    fd.append("campaign", campaign);
    const res = await fetch("/api/leads/bulk", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBulkBusy(false);
    if (!res.ok) setBulkResult({ ok: false, error: data.error, details: data.details || [] });
    else { setBulkResult({ ok: true, imported: data.imported, skipped: data.skipped }); setTimeout(() => router.refresh(), 1400); }
  }

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    setSelectAllMatching(false);
  }
  function toggleAll() {
    if (selected.size === items.length) { setSelected(new Set()); setSelectAllMatching(false); }
    else setSelected(new Set(items.map((l) => l.id)));
  }

  async function doAssign() {
    if (!assignTo) return;
    setAssignBusy(true);
    // "All matching" sends the FILTER, not ids - the server re-runs the same
    // query and assigns everything that matches in one UPDATE.
    const payload = selectAllMatching
      ? { filter: { status: statusId, q: search }, agent_id: assignTo }
      : { ids: Array.from(selected), agent_id: assignTo };

    const res = await fetch("/api/leads/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setAssignBusy(false);
    if (!res.ok) return alert(data.error || "Assign failed");
    alert(`Assigned ${data.assigned} lead(s) to ${data.agent}.`);
    setSelected(new Set());
    setSelectAllMatching(false);
    setAssignTo("");
    router.refresh();
  }

  const pageNums = [];
  const span = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - span && i <= page + span)) pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  const fmtFollow = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const today = new Date(); today.setHours(0,0,0,0);
    const dd = new Date(date); dd.setHours(0,0,0,0);
    const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    if (dd.getTime() === today.getTime()) return "Today";
    return day;
  };

  const tabs = [
    { key: "all", label: "All", count: counts?.all, id: null },
    { key: "new", label: "New", count: counts?.new, id: statusIdByName?.New },
    { key: "hot", label: "Hot", count: counts?.hot, id: statusIdByName?.Hot },
    { key: "warm", label: "Warm", count: counts?.warm, id: statusIdByName?.Warm },
    { key: "interested", label: "Interested", count: counts?.interested, id: statusIdByName?.Interested },
  ];

  const gridCols = canImport
    ? "lg:grid-cols-[auto_2fr_2fr_1fr_1.2fr_1.4fr]"
    : "lg:grid-cols-[2fr_2fr_1fr_1.2fr_1.4fr]";

  const activeFilterCount = (statusId && statusId !== "all" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="bg-[#F7F5F0]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .font-sans { font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rise-in { animation: riseIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="px-6 py-8 font-sans sm:px-8">
        {/* Page title */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[26px] font-semibold tracking-tight text-[#14201F]">Leads</h1>
            <p className="mt-1 text-[13px] text-[#8C9795]">
              {total.toLocaleString("en-AE")} total {total === 1 ? "lead" : "leads"} across every source
            </p>
          </div>

          {canImport ? (
            <div className="flex items-center gap-2">
              <Link href="/leads/sheets"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] shadow-sm transition hover:border-[#1F7A6B] hover:text-[#1F7A6B]">
                <IconSheet className="h-3.5 w-3.5" />
                Google Sheets
              </Link>
              <button
                onClick={() => { setBulkOpen(!bulkOpen); setBulkResult(null); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] shadow-sm transition hover:bg-[#16292C] hover:shadow-md"
              >
                {bulkOpen ? <IconClose className="h-3.5 w-3.5" /> : <IconUpload className="h-3.5 w-3.5" />}
                Import
              </button>
            </div>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#E7E3D9] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,28,30,0.03)]">
          {tabs.map((t) => {
            const active = (t.id || "all") === (statusId || "all") ||
              (t.key === "all" && (statusId === "all" || !statusId));
            return (
              <button
                key={t.key}
                onClick={() => go({ status: t.id || "all", page: 1 })}
                className={
                  "rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-200 " +
                  (active
                    ? "bg-gradient-to-r from-[#1F7A6B] to-[#186459] text-white shadow-sm"
                    : "text-[#6C7A78] hover:bg-[#F7F5F0]")
                }
              >
                {t.label}
                {t.count != null ? (
                  <span className={"ml-1.5 text-xs " + (active ? "text-white/75" : "text-[#AAB3B0]")}>
                    {t.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Import panel */}
        {canImport && bulkOpen ? (
          <div className="rise-in mb-6 overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Import leads from CSV</h2>
              <p className="mt-1 text-xs text-[#8C9795]">
                One sheet per campaign. Pick the source, name the campaign, upload the sheet.
                Name and phone are required. Duplicates (by phone) are skipped. Leads auto-assign in rotation.
              </p>
              <button onClick={() => { window.location.href = "/api/leads/bulk"; }}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1F7A6B] hover:underline">
                <IconDownload className="h-3.5 w-3.5" />
                Download CSV template
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]">Source</label>
                  <SelectWrap value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    <option value="">Select source...</option>
                    {sources.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </SelectWrap>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]">Campaign name</label>
                  <input className={fieldCls} value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Downtown Q1 2026" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-[#D8D3C6] bg-[#FBF9F4] p-4">
                <input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files[0] || null)}
                  className="block text-xs text-[#6C7A78] file:mr-3 file:rounded-full file:border-0 file:bg-[#0F1C1E] file:px-3.5 file:py-2 file:text-xs file:font-medium file:text-[#FBFAF7] hover:file:bg-[#16292C]" />
                {bulkFile ? <span className="text-xs text-[#8C9795]">{bulkFile.name}</span> : null}
                <button onClick={bulkUpload} disabled={!bulkFile || bulkBusy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40">
                  <IconUpload className={`h-3.5 w-3.5 ${bulkBusy ? "animate-pulse" : ""}`} />
                  {bulkBusy ? "Importing…" : "Import"}
                </button>
              </div>

              {bulkResult && bulkResult.ok ? (
                <p className="mt-3 rounded-lg bg-[#1F7A6B]/8 px-3 py-2 text-sm text-[#186459]">
                  Imported {bulkResult.imported}{bulkResult.skipped ? `, skipped ${bulkResult.skipped} duplicate(s)` : ""}. Refreshing.
                </p>
              ) : null}
              {bulkResult && !bulkResult.ok ? (
                <div className="mt-3 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
                  <p className="text-sm text-[#A03A2B]">{bulkResult.error}</p>
                  {bulkResult.details && bulkResult.details.length ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-[#A03A2B]">
                      {bulkResult.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Search + filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E7E3D9] bg-white p-3 shadow-[0_1px_2px_rgba(15,28,30,0.03)]">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAB3B0]" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search #id, name or phone..." className={fieldCls + " pl-10"} />
            {searchInput ? (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAB3B0] transition hover:text-[#14201F]"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 text-[#8C9795]">
            <IconFilter className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-[0.06em]">Filter</span>
          </div>

          <SelectWrap className="max-w-[200px]" value={statusId} onChange={(e) => go({ status: e.target.value, page: 1 })}>
            <option value="all">All statuses</option>
            {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </SelectWrap>

          {activeFilterCount > 0 ? (
            <button
              onClick={() => { setSearchInput(""); go({ q: null, status: "all", page: 1 }); }}
              className="inline-flex items-center gap-1 rounded-full border border-[#E4E1DA] px-3 py-1.5 text-xs font-medium text-[#6C7A78] transition hover:border-[#A03A2B] hover:text-[#A03A2B]"
            >
              <IconClose className="h-3 w-3" />
              Clear filters
            </button>
          ) : null}

          <span className="ml-auto whitespace-nowrap rounded-full bg-[#F3F1EB] px-3 py-1.5 text-xs font-medium text-[#8C9795]">
            {total.toLocaleString("en-AE")} {total === 1 ? "result" : "results"}
          </span>
        </div>

        {/* Bulk assign bar */}
        {canImport && (selected.size > 0 || selectAllMatching) ? (
          <div className="rise-in mb-5 rounded-2xl border border-[#1F7A6B]/25 bg-gradient-to-r from-[#1F7A6B]/8 to-transparent p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#14201F]">
                <IconUsers className="h-4 w-4 text-[#1F7A6B]" />
                {selectAllMatching ? `All ${total} matching selected` : `${selected.size} selected`}
              </span>
              <SelectWrap className="max-w-[220px]" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Assign to agent...</option>
                {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </SelectWrap>
              <button onClick={doAssign} disabled={!assignTo || assignBusy}
                className="rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40">
                {assignBusy ? "Assigning…" : "Assign"}
              </button>
              <button onClick={() => { setSelected(new Set()); setSelectAllMatching(false); }}
                className="text-xs font-medium text-[#6C7A78] transition hover:text-[#14201F]">Clear</button>
            </div>
            {!selectAllMatching && selected.size === items.length && total > items.length ? (
              <button onClick={() => setSelectAllMatching(true)}
                className="mt-2 text-xs font-medium text-[#1F7A6B] hover:underline">
                Select all {total} leads matching this filter
              </button>
            ) : null}
          </div>
        ) : null}

        {/* List */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8D3C6] bg-white/60 py-20 text-center">
            <IconInbox className="mx-auto h-8 w-8 text-[#D8D3C6]" />
            <p className="mt-3 text-sm text-[#8C9795]">No leads match your filters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className={"hidden border-b border-[#F0EEE6] bg-[#FBF9F4] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795] lg:grid " + gridCols}>
              {canImport ? (
                <div className="pr-2">
                  <input type="checkbox" checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleAll} className="h-4 w-4 accent-[#1F7A6B]" />
                </div>
              ) : null}
              <div>Lead</div>
              <div>Requirement</div>
              <div>Source</div>
              <div>Status</div>
              <div>Agent / Next</div>
            </div>

            {items.map((l) => {
              const req = [l.preferred_type, l.preferred_location].filter(Boolean).join(" - ");
              const budget = budgetLabel(l.budget_min, l.budget_max);
              const follow = fmtFollow(l.next_follow_up_at);
              const isSel = selected.has(l.id) || selectAllMatching;
              return (
                <div
                  key={l.id}
                  className={"grid grid-cols-1 items-center gap-3 border-b border-[#F0EEE6] px-5 py-4 transition-colors duration-150 last:border-0 hover:bg-[#FBF9F4] lg:grid " + gridCols + (isSel ? " bg-[#1F7A6B]/5" : "")}
                >
                  {canImport ? (
                    <div className="pr-2">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(l.id)}
                        className="h-4 w-4 accent-[#1F7A6B]" />
                    </div>
                  ) : null}

                  <Link href={`/leads/${l.id}`} className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
                      style={{ background: avatarColor(l.name) }}
                    >
                      {initials(l.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[#14201F]">{l.name}</div>
                      <div className="truncate text-xs text-[#8C9795]">{l.phone}</div>
                    </div>
                  </Link>

                  <Link href={`/leads/${l.id}`} className="min-w-0">
                    <div className="truncate text-sm text-[#14201F]">{req || "-"}</div>
                    {budget ? <div className="truncate text-xs text-[#8C9795]">{budget}</div> : null}
                  </Link>

                  <Link href={`/leads/${l.id}`} className="truncate text-sm text-[#6C7A78]">
                    {l.source_name || "-"}
                  </Link>

                  <Link href={`/leads/${l.id}`}>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        color: l.status_color || "#1F7A6B",
                        background: (l.status_color || "#1F7A6B") + "18",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.status_color || "#1F7A6B" }} />
                      {l.status_name || "-"}
                    </span>
                  </Link>

                  <Link href={`/leads/${l.id}`} className="min-w-0">
                    <div className="truncate text-sm text-[#14201F]">{l.agent_name || "Unassigned"}</div>
                    {follow ? (
                      <div className={"mt-0.5 inline-flex items-center gap-1 truncate text-xs " + (follow === "Today" ? "font-semibold text-[#C58A12]" : "text-[#AAB3B0]")}>
                        <IconClock className="h-3 w-3" />
                        {follow}
                      </div>
                    ) : null}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            <button onClick={() => go({ page: page - 1 })} disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-[#E4E1DA] bg-white px-3.5 py-1.5 text-sm text-[#6C7A78] transition hover:border-[#1F7A6B] hover:text-[#1F7A6B] disabled:cursor-not-allowed disabled:opacity-30">
              <IconChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            {pageNums.map((n, i) =>
              n === "..." ? (<span key={"e" + i} className="px-2 text-sm text-[#AAB3B0]">···</span>) : (
                <button key={n} onClick={() => go({ page: n })}
                  className={"rounded-full px-3.5 py-1.5 text-sm font-medium transition " + (n === page ? "bg-gradient-to-r from-[#1F7A6B] to-[#186459] text-white shadow-sm" : "border border-[#E4E1DA] bg-white text-[#6C7A78] hover:border-[#1F7A6B] hover:text-[#1F7A6B]")}>
                  {n}
                </button>
              ),
            )}
            <button onClick={() => go({ page: page + 1 })} disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-full border border-[#E4E1DA] bg-white px-3.5 py-1.5 text-sm text-[#6C7A78] transition hover:border-[#1F7A6B] hover:text-[#1F7A6B] disabled:cursor-not-allowed disabled:opacity-30">
              Next
              <IconChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}