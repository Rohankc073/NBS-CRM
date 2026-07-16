"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";

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

  function go(overrides) {
    const next = new URLSearchParams(params.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    });
    router.push(`/leads?${next.toString()}`);
  }

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
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
    if (!res.ok) {
      setBulkResult({
        ok: false,
        error: data.error,
        details: data.details || [],
      });
    } else {
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

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "-";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E1DA] pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
            Leads
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">{total} total</p>
        </div>
        {canImport ? (
          <button
            onClick={() => {
              setBulkOpen(!bulkOpen);
              setBulkResult(null);
            }}
            className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] transition hover:bg-[#16292C]"
          >
            Import leads
          </button>
        ) : null}
      </div>

      {/* Import panel */}
      {canImport && bulkOpen ? (
        <div className="mt-5 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#14201F]">
            Import leads from CSV
          </h2>
          <p className="mt-1 text-xs text-[#6C7A78]">
            One sheet per campaign. Pick the source, name the campaign, upload
            the sheet. Name and phone are required; everything else is optional.
            Duplicates (by phone) are skipped automatically. Leads are
            auto-assigned to agents in rotation.
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

      {/* Search + status filter */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name or phone..."
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
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-[#6C7A78]">No leads match.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-[#E4E1DA] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E1DA] text-left text-xs text-[#6C7A78]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[#F0EEE9] last:border-0 hover:bg-[#FBFAF7]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="font-medium text-[#14201F] hover:text-[#1F7A6B] hover:underline"
                    >
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#6C7A78]">{l.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full border px-2 py-0.5 text-xs"
                      style={{
                        borderColor: (l.status_color || "#1F7A6B") + "55",
                        color: l.status_color || "#1F7A6B",
                        background: (l.status_color || "#1F7A6B") + "15",
                      }}
                    >
                      {l.status_name || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6C7A78]">
                    {l.source_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-[#6C7A78]">
                    {l.campaign || "-"}
                  </td>
                  <td className="px-4 py-3 text-[#6C7A78]">
                    {l.agent_name || "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-[#6C7A78]">
                    {fmtDate(l.next_follow_up_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
