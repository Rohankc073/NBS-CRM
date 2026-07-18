"use client";

import { Upload, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";

const STATUS_STYLE = {
  New: { bg: "#6C7A7818", fg: "#6C7A78" },
  Contacted: { bg: "#2563EB18", fg: "#1D4ED8" },
  "Not Interested": { bg: "#A03A2B18", fg: "#A03A2B" },
  Interested: { bg: "#15803D18", fg: "#15803D" },
  Callback: { bg: "#C58A1218", fg: "#8a6410" },
  Converted: { bg: "#7C3AED18", fg: "#6D28D9" },
};

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
  const p = (name || "").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function ColdClient({
  initial,
  canManage,
  agents,
  page,
  totalPages,
  total,
  status,
  search,
  counts,
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState(initial);
  const [searchInput, setSearchInput] = useState(search || "");

  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [batch, setBatch] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [assignTo, setAssignTo] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  useEffect(() => {
    setItems(initial);
    setSelected(new Set());
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
    router.push(`/cold?${next.toString()}`);
  }

  useEffect(() => {
    const cur = search || "";
    if (searchInput === cur) return;
    const t = setTimeout(() => go({ q: searchInput, page: 1 }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  async function doImport() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("batch", batch);
    fd.append("auto_assign", autoAssign ? "true" : "false");
    const res = await fetch("/api/cold/bulk", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setResult({ ok: false, error: data.error });
    else {
      setResult({ ok: true, imported: data.imported, skipped: data.skipped });
      setTimeout(() => router.refresh(), 1400);
    }
  }

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((c) => c.id)));
  }

  async function bulkAssign() {
    if (!assignTo || selected.size === 0) return;
    setAssignBusy(true);
    const res = await fetch("/api/cold/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), agent_id: assignTo }),
    });
    setAssignBusy(false);
    if (res.ok) {
      setSelected(new Set());
      setAssignTo("");
      router.refresh();
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
    if (dd.getTime() === today.getTime()) return "Today";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const tabs = [
    { key: "all", label: "All", count: counts?.all },
    { key: "New", label: "New", count: counts?.new },
    { key: "Contacted", label: "Contacted", count: counts?.contacted },
    { key: "Interested", label: "Interested", count: counts?.interested },
    { key: "Callback", label: "Callback", count: counts?.callback },
  ];

  return (
    <div className="p-8">
      {/* Header: tabs + import */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((t) => {
            const active =
              (t.key === "all" && (status === "all" || !status)) ||
              status === t.key;
            return (
              <button
                key={t.key}
                onClick={() => go({ status: t.key, page: 1 })}
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
        {canManage ? (
          <div className="flex items-center gap-2">
            <Link
              href="/cold/sheets"
              className="rounded-md border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] transition hover:border-[#1F7A6B]"
            >
              Google Sheets
            </Link>
            <button
              onClick={() => {
                setImportOpen(!importOpen);
                setResult(null);
              }}
              className="flex items-center gap-2 rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C]"
            >
              <Upload size={16} /> Import
            </button>
          </div>
        ) : null}
      </div>

      {/* Import panel */}
      {canManage && importOpen ? (
        <div className="mt-4 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#14201F]">
            Import cold contacts
          </h2>
          <p className="mt-1 text-xs text-[#6C7A78]">
            Name and phone required; other columns optional. Duplicates (by
            phone) skipped.
          </p>
          <button
            onClick={() => {
              window.location.href = "/api/cold/bulk";
            }}
            className="mt-3 inline-block text-sm text-[#1F7A6B] hover:underline"
          >
            Download CSV template
          </button>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#14201F]">
                Batch label (optional)
              </label>
              <input
                className={fieldCls}
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. Marina Towers list"
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-[#14201F]">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="h-4 w-4 accent-[#1F7A6B]"
              />
              Auto-distribute to agents (round-robin)
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="block text-xs text-[#6C7A78] file:mr-3 file:rounded-md file:border-0 file:bg-[#0F1C1E] file:px-3 file:py-2 file:text-xs file:text-[#FBFAF7] hover:file:bg-[#16292C]"
            />
            <button
              onClick={doImport}
              disabled={!file || busy}
              className="rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
            >
              {busy ? "Importing" : "Import"}
            </button>
          </div>
          {result && result.ok ? (
            <p className="mt-3 text-sm text-[#1F7A6B]">
              Imported {result.imported}
              {result.skipped ? `, skipped ${result.skipped}` : ""}. Refreshing.
            </p>
          ) : null}
          {result && !result.ok ? (
            <p className="mt-3 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
              {result.error}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Search + status dropdown */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search #id, name, phone, building..."
          className={fieldCls + " max-w-xs"}
        />
        <span className="text-xs text-[#9AA6A4]">{total} contacts</span>
      </div>

      {/* Bulk-assign bar (managers, when rows selected) */}
      {canManage && selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#1F7A6B]/30 bg-[#1F7A6B]/5 p-3">
          <span className="text-sm font-medium text-[#14201F]">
            {selected.size} selected
          </span>
          <select
            className={fieldCls + " max-w-[220px]"}
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
          >
            <option value="">Assign to agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={bulkAssign}
            disabled={!assignTo || assignBusy}
            className="flex items-center gap-2 rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
          >
            <UserCheck size={15} /> {assignBusy ? "Assigning" : "Assign"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-[#6C7A78] hover:text-[#14201F]"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* List */}
      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-[#6C7A78]">No contacts match.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-[#E4E1DA] bg-white">
          <div
            className={
              "hidden border-b border-[#E4E1DA] px-5 py-3 text-xs font-medium uppercase tracking-wide text-[#9AA6A4] lg:grid " +
              (canManage
                ? "lg:grid-cols-[auto_2fr_2fr_1.2fr_1.4fr]"
                : "lg:grid-cols-[2fr_2fr_1.2fr_1.4fr]")
            }
          >
            {canManage ? (
              <div className="pr-2">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-[#1F7A6B]"
                />
              </div>
            ) : null}
            <div>Contact</div>
            <div>Property</div>
            <div>Status</div>
            <div>Agent / Next</div>
          </div>

          {items.map((c) => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.New;
            const prop = [c.building, c.unit_number && `Unit ${c.unit_number}`]
              .filter(Boolean)
              .join(" - ");
            const specs = [
              c.no_of_beds && `${c.no_of_beds} BR`,
              c.sqft && `${c.sqft} sqft`,
            ]
              .filter(Boolean)
              .join(" - ");
            const follow = fmtFollow(c.next_follow_up_at);
            const isSel = selected.has(c.id);
            return (
              <div
                key={c.id}
                className={
                  "grid grid-cols-1 items-center gap-3 border-b border-[#F0EEE9] px-5 py-4 last:border-0 hover:bg-[#FBFAF7] lg:grid " +
                  (canManage
                    ? "lg:grid-cols-[auto_2fr_2fr_1.2fr_1.4fr]"
                    : "lg:grid-cols-[2fr_2fr_1.2fr_1.4fr]") +
                  (isSel ? " bg-[#1F7A6B]/5" : "")
                }
              >
                {canManage ? (
                  <div className="pr-2">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-[#1F7A6B]"
                    />
                  </div>
                ) : null}
                <Link
                  href={`/cold/${c.id}`}
                  className="flex items-center gap-3"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: avatarColor(c.name) }}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#14201F]">
                      {c.name}
                    </div>
                    <div className="truncate text-xs text-[#6C7A78]">
                      {c.phone}
                    </div>
                  </div>
                </Link>
                <Link href={`/cold/${c.id}`} className="min-w-0">
                  <div className="truncate text-sm text-[#14201F]">
                    {prop || "-"}
                  </div>
                  {specs ? (
                    <div className="truncate text-xs text-[#6C7A78]">
                      {specs}
                    </div>
                  ) : null}
                </Link>
                <Link href={`/cold/${c.id}`}>
                  <span
                    className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {c.status}
                  </span>
                </Link>
                <Link href={`/cold/${c.id}`} className="min-w-0">
                  <div className="truncate text-sm text-[#14201F]">
                    {c.agent_name || "Unassigned"}
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
                </Link>
              </div>
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
