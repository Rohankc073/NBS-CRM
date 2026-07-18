"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";

const AVATAR_COLORS = [
  "#1F7A6B",
  "#2563EB",
  "#7C3AED",
  "#C58A12",
  "#A03A2B",
  "#0891B2",
  "#BE185D",
  "#4338CA",
  "#15803D",
  "#B45309",
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++)
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
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

export default function LeadsClient({
  initial,
  statuses,
  sources,
  canImport,
  page,
  totalPages,
  total,
  statusId,
  search,
  counts,
  statusIdByName,
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

  useEffect(() => {
    setItems(initial);
  }, [initial]);
  useEffect(() => {
    setSearchInput(search || "");
  }, [search]);

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
    if (!campaign.trim()) {
      setBulkResult({ ok: false, error: "Enter a campaign name." });
      return;
    }
    setBulkBusy(true);
    setBulkResult(null);
    const fd = new FormData();
    fd.append("file", bulkFile);
    fd.append("source_id", sourceId);
    fd.append("campaign", campaign);
    const res = await fetch("/api/leads/bulk", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBulkBusy(false);
    if (!res.ok)
      setBulkResult({
        ok: false,
        error: data.error,
        details: data.details || [],
      });
    else {
      setBulkResult({
        ok: true,
        imported: data.imported,
        skipped: data.skipped,
      });
      setTimeout(() => router.refresh(), 1400);
    }
  }

  const pageNums = [];
  const span = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - span && i <= page + span))
      pageNums.push(i);
    else if (pageNums[pageNums.length - 1] !== "...") pageNums.push("...");
  }

  const fmtFollow = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dd = new Date(date);
    dd.setHours(0, 0, 0, 0);
    const day = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    if (dd.getTime() === today.getTime()) return "Today";
    return day;
  };

  const tabs = [
    { key: "all", label: "All", count: counts?.all, id: null },
    { key: "new", label: "New", count: counts?.new, id: statusIdByName?.New },
    { key: "hot", label: "Hot", count: counts?.hot, id: statusIdByName?.Hot },
    {
      key: "warm",
      label: "Warm",
      count: counts?.warm,
      id: statusIdByName?.Warm,
    },
    {
      key: "interested",
      label: "Interested",
      count: counts?.interested,
      id: statusIdByName?.Interested,
    },
  ];

  return (
    <div className="p-8">
      {/* Header row: tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => {
            const active =
              (t.id || "all") === (statusId || "all") ||
              (t.key === "all" && (statusId === "all" || !statusId));
            return (
              <button
                key={t.key}
                onClick={() => go({ status: t.id || "all", page: 1 })}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-[#1F7A6B] text-white"
                    : "text-[#6C7A78] hover:bg-[#F0EEE9]")
                }
              >
                {t.label}
                {t.count != null ? (
                  <span
                    className={
                      "ml-1.5 text-xs " +
                      (active ? "text-white/80" : "text-[#9AA6A4]")
                    }
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {canImport ? (
          <div className="flex items-center gap-2">
            <Link
              href="/leads/sheets"
              className="rounded-md border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] transition hover:border-[#1F7A6B]"
            >
              Google Sheets
            </Link>
            <button
              onClick={() => {
                setBulkOpen(!bulkOpen);
                setBulkResult(null);
              }}
              className="flex items-center gap-2 rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] transition hover:bg-[#16292C]"
            >
              Import
            </button>
          </div>
        ) : null}
      </div>

      {/* Import panel */}
      {canImport && bulkOpen ? (
        <div className="mt-4 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#14201F]">
            Import leads from CSV
          </h2>
          <p className="mt-1 text-xs text-[#6C7A78]">
            One sheet per campaign. Pick the source, name the campaign, upload
            the sheet. Name and phone are required. Duplicates (by phone) are
            skipped. Leads auto-assign in rotation.
          </p>
          <button
            onClick={() => {
              window.location.href = "/api/leads/bulk";
            }}
            className="mt-3 inline-block text-sm text-[#1F7A6B] hover:underline"
          >
            Download CSV template
          </button>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">
                Source
              </label>
              <select
                className={fieldCls}
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">Select source...</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">
                Campaign name
              </label>
              <input
                className={fieldCls}
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. Downtown Q1 2026"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBulkFile(e.target.files[0] || null)}
              className="block text-xs text-[#6C7A78] file:mr-3 file:rounded-md file:border-0 file:bg-[#0F1C1E] file:px-3 file:py-2 file:text-xs file:text-[#FBFAF7] hover:file:bg-[#16292C]"
            />
            <button
              onClick={bulkUpload}
              disabled={!bulkFile || bulkBusy}
              className="rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
            >
              {bulkBusy ? "Importing" : "Import"}
            </button>
          </div>
          {bulkResult && bulkResult.ok ? (
            <p className="mt-3 text-sm text-[#1F7A6B]">
              Imported {bulkResult.imported}
              {bulkResult.skipped
                ? `, skipped ${bulkResult.skipped} duplicate(s)`
                : ""}
              . Refreshing.
            </p>
          ) : null}
          {bulkResult && !bulkResult.ok ? (
            <div className="mt-3 border-l-2 border-[#A03A2B] pl-3">
              <p className="text-sm text-[#A03A2B]">{bulkResult.error}</p>
              {bulkResult.details && bulkResult.details.length ? (
                <ul className="mt-1 space-y-0.5 text-xs text-[#A03A2B]">
                  {bulkResult.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Search + full status dropdown */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search #id, name or phone..."
          className={fieldCls + " max-w-xs"}
        />
        <select
          className={fieldCls + " max-w-[200px]"}
          value={statusId}
          onChange={(e) => go({ status: e.target.value, page: 1 })}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#9AA6A4]">{total} leads</span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-[#6C7A78]">No leads match.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-[#E4E1DA] bg-white">
          <div className="hidden border-b border-[#E4E1DA] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#9AA6A4] lg:grid lg:grid-cols-[2fr_2fr_1fr_1.2fr_1.4fr]">
            <div>Lead</div>
            <div>Requirement</div>
            <div>Source</div>
            <div>Status</div>
            <div>Agent / Next</div>
          </div>

          {items.map((l) => {
            const req = [l.preferred_type, l.preferred_location]
              .filter(Boolean)
              .join(" - ");
            const budget = budgetLabel(l.budget_min, l.budget_max);
            const follow = fmtFollow(l.next_follow_up_at);
            return (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="grid grid-cols-1 items-center gap-3 border-b border-[#F0EEE9] px-5 py-4 transition last:border-0 hover:bg-[#FBFAF7] lg:grid-cols-[2fr_2fr_1fr_1.2fr_1.4fr]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: avatarColor(l.name) }}
                  >
                    {initials(l.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#14201F]">
                      {l.name}
                    </div>
                    <div className="truncate text-xs text-[#6C7A78]">
                      {l.phone}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm text-[#14201F]">
                    {req || "-"}
                  </div>
                  {budget ? (
                    <div className="truncate text-xs text-[#6C7A78]">
                      {budget}
                    </div>
                  ) : null}
                </div>

                <div className="truncate text-sm text-[#6C7A78]">
                  {l.source_name || "-"}
                </div>

                <div>
                  <span
                    className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      color: l.status_color || "#1F7A6B",
                      background: (l.status_color || "#1F7A6B") + "18",
                    }}
                  >
                    {l.status_name || "-"}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm text-[#14201F]">
                    {l.agent_name || "Unassigned"}
                  </div>
                  {follow ? (
                    <div
                      className={
                        "truncate text-xs " +
                        (follow === "Today"
                          ? "font-medium text-[#C58A12]"
                          : "text-[#9AA6A4]")
                      }
                    >
                      {follow}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-1">
          <button
            onClick={() => go({ page: page - 1 })}
            disabled={page <= 1}
            className="rounded-md border border-[#E4E1DA] px-3 py-1.5 text-sm text-[#6C7A78] hover:border-[#1F7A6B] disabled:opacity-30"
          >
            Prev
          </button>
          {pageNums.map((n, i) =>
            n === "..." ? (
              <span key={"e" + i} className="px-2 text-sm text-[#9AA6A4]">
                ...
              </span>
            ) : (
              <button
                key={n}
                onClick={() => go({ page: n })}
                className={
                  "rounded-md px-3 py-1.5 text-sm transition " +
                  (n === page
                    ? "bg-[#0F1C1E] text-white"
                    : "border border-[#E4E1DA] text-[#6C7A78] hover:border-[#1F7A6B]")
                }
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => go({ page: page + 1 })}
            disabled={page >= totalPages}
            className="rounded-md border border-[#E4E1DA] px-3 py-1.5 text-sm text-[#6C7A78] hover:border-[#1F7A6B] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
