"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_STYLE = {
  pending: "bg-[#C58A12]/10 text-[#8a6410] border-[#C58A12]/30",
  approved: "bg-[#1F7A6B]/10 text-[#1F7A6B] border-[#1F7A6B]/30",
  rejected: "bg-[#A03A2B]/10 text-[#A03A2B] border-[#A03A2B]/30",
};

const AED = (n) =>
  n == null ? "Price on request" : "AED " + Number(n).toLocaleString("en-AE");

const pill = "rounded-full border px-3 py-1 text-xs capitalize transition";

export default function PropertiesClient({ initial, canCreate, canReview }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  async function review(id, action) {
    let reason = null;
    if (action === "reject") {
      reason = prompt("Reason for rejection (optional):") || "No reason given";
    }
    setError("");
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Something went wrong");
    setItems(
      items.map((p) =>
        p.id === id
          ? { ...p, approval_status: data.property.approval_status }
          : p,
      ),
    );
  }

  async function remove(id, name) {
    if (!confirm(`Delete "${name}"? It will be removed from all listings.`))
      return;
    setError("");
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Something went wrong");
    setItems(items.filter((p) => p.id !== id));
  }

  async function bulkUpload() {
    if (!bulkFile) return;
    setBulkBusy(true);
    setBulkResult(null);

    const fd = new FormData();
    fd.append("file", bulkFile);
    const res = await fetch("/api/properties/bulk", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));

    setBulkBusy(false);
    if (!res.ok) {
      setBulkResult({ ok: false, error: data.error, details: data.details || [] });
    } else {
      setBulkResult({ ok: true, imported: data.imported });
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  const shown =
    filter === "all"
      ? items
      : items.filter((p) => p.approval_status === filter);
  const pendingCount = items.filter(
    (p) => p.approval_status === "pending",
  ).length;

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E1DA] pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
            Properties
          </h1>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {items.length} total
            {canReview && pendingCount > 0
              ? " - " + pendingCount + " awaiting review"
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {canReview ? (
            <button
              onClick={() => {
                setBulkOpen(!bulkOpen);
                setBulkResult(null);
              }}
              className="rounded-md border border-[#E4E1DA] bg-white px-4 py-2 text-sm font-medium text-[#14201F] transition hover:border-[#1F7A6B]"
            >
              Bulk upload
            </button>
          ) : null}
          {canCreate ? (
            <Link
              href="/properties/new"
              className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] transition hover:bg-[#16292C]"
            >
              Add property
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              pill +
              " " +
              (filter === f
                ? "border-[#1F7A6B] bg-[#1F7A6B] text-white"
                : "border-[#E4E1DA] bg-white text-[#6C7A78] hover:border-[#1F7A6B]")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {canReview && bulkOpen ? (
        <div className="mt-5 rounded-lg border border-[#E4E1DA] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#14201F]">
            Bulk upload properties
          </h2>
          <p className="mt-1 text-xs text-[#6C7A78]">
            Download the template, fill one property per row, and upload. Add
            images and documents later from each Edit page. If any row has an
            error, nothing is imported.
          </p>
          
           <button
            onClick={() => { window.location.href = "/api/properties/bulk"; }}
            className="mt-3 inline-block text-sm text-[#1F7A6B] hover:underline"
          >
            Download CSV template
          </button>
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
              Imported {bulkResult.imported}. Refreshing.
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

      {error ? (
        <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
          {error}
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-[#6C7A78]">No properties here yet.</p>
          {canCreate ? (
            <Link
              href="/properties/new"
              className="mt-2 inline-block text-sm text-[#1F7A6B] hover:underline"
            >
              Add your first property
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <div
              key={p.id}
              className="group overflow-hidden rounded-xl border border-[#E4E1DA] bg-white transition hover:border-[#1F7A6B] hover:shadow-sm"
            >
              <Link href={`/properties/${p.id}`} className="block">
                <div className="relative h-44 bg-[#F0EEE9]">
                  {p.thumb ? (
                    <img
                      src={p.thumb}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#9AA6A4]">
                      No image
                    </div>
                  )}
                  <span
                    className={
                      "absolute left-3 top-3 " +
                      pill +
                      " border-transparent backdrop-blur " +
                      STATUS_STYLE[p.approval_status]
                    }
                  >
                    {p.approval_status}
                  </span>
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/properties/${p.id}`}>
                  <h3 className="truncate font-medium text-[#14201F] group-hover:text-[#1F7A6B]">
                    {p.name}
                  </h3>
                </Link>
                <p className="mt-0.5 truncate text-xs text-[#6C7A78]">
                  {p.type_name || "-"}
                  {p.community ? " - " + p.community : ""}
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs text-[#6C7A78]">
                  {p.bedrooms != null ? <span>{p.bedrooms} bed</span> : null}
                  {p.bathrooms != null ? <span>{p.bathrooms} bath</span> : null}
                  <span className="capitalize">{p.availability}</span>
                </div>

                <div className="mt-3 text-sm font-semibold text-[#1F7A6B]">
                  {AED(p.price)}
                </div>

                {canReview ? (
                  <p className="mt-2 truncate text-xs text-[#9AA6A4]">
                    Added by {p.created_by_name || "-"}
                  </p>
                ) : null}

                {canReview ? (
                  <div className="mt-3 border-t border-[#F0EEE9] pt-3">
                    {p.approval_status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => review(p.id, "approve")}
                          className="flex-1 rounded-md bg-[#1F7A6B] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#1a6659]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => review(p.id, "reject")}
                          className="flex-1 rounded-md border border-[#E4E1DA] px-2 py-1.5 text-xs text-[#6C7A78] hover:border-[#A03A2B] hover:text-[#A03A2B]"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-2 flex justify-end gap-4">
                      <Link
                        href={`/properties/${p.id}/edit`}
                        className="text-xs text-[#6C7A78] hover:text-[#14201F]"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="text-xs text-[#6C7A78] hover:text-[#A03A2B]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}