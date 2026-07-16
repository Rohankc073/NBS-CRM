"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1 block text-xs font-medium text-[#6C7A78]";

function toForm(l) {
  const v = (x) => (x == null ? "" : String(x));
  return {
    name: v(l.name), phone: v(l.phone), alt_phone: v(l.alt_phone),
    whatsapp: v(l.whatsapp), email: v(l.email), nationality: v(l.nationality),
    budget_min: v(l.budget_min), budget_max: v(l.budget_max),
    preferred_type: v(l.preferred_type), preferred_location: v(l.preferred_location),
    bedrooms: v(l.bedrooms), notes: v(l.notes),
  };
}

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

export default function LeadDetailClient({ lead, statuses, history }) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(toForm(lead));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [current, setCurrent] = useState(lead);

  const [statusId, setStatusId] = useState(lead.status_id);
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(
    lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 10) : "",
  );
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusName, setStatusName] = useState(lead.status_name);

  const [localHistory, setLocalHistory] = useState(history);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function saveEdit() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setCurrent({ ...current, ...form });
    setEditing(false);
  }

  async function changeStatus() {
    setError("");
    setStatusBusy(true);
    const res = await fetch(`/api/leads/${lead.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_id: statusId, note, next_follow_up_at: followUp }),
    });
    const data = await res.json().catch(() => ({}));
    setStatusBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");

    setStatusName(data.status_name);
    const toName = statuses.find((s) => s.id === statusId)?.name || data.status_name;
    setLocalHistory([
      { created_at: new Date().toISOString(), notes: note || null,
        from_name: statusName, to_name: toName, by_name: "You" },
      ...localHistory,
    ]);
    setNote("");
    router.refresh();
  }

  const budget =
    current.budget_min || current.budget_max
      ? `AED ${Number(current.budget_min || 0).toLocaleString("en-AE")} - ${Number(current.budget_max || 0).toLocaleString("en-AE")}`
      : null;

  const Info = ({ label, value }) =>
    value ? (
      <div>
        <div className={labelCls}>{label}</div>
        <div className="text-sm text-[#14201F]">{value}</div>
      </div>
    ) : null;

  return (
    <div className="p-8">
      <button
        onClick={() => router.back()}
        className="text-xs text-[#6C7A78] hover:text-[#14201F]"
      >
        Back to leads
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">{current.name}</h1>
            {current.ref_no ? (
              <span className="font-mono text-xs text-[#9AA6A4]">#{current.ref_no}</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {current.phone}
            {current.source_name ? ` - ${current.source_name}` : ""}
            {current.campaign ? ` - ${current.campaign}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-[#1F7A6B]/30 bg-[#1F7A6B]/10 px-3 py-1 text-xs font-medium text-[#1F7A6B]">
          {statusName || "New"}
        </span>
      </div>

      {error ? (
        <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT: lead info (2 cols) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#14201F]">Lead information</h2>
              {!editing ? (
                <button
                  onClick={() => { setForm(toForm(current)); setEditing(true); setError(""); }}
                  className="text-xs text-[#1F7A6B] hover:underline"
                >
                  Edit
                </button>
              ) : null}
            </div>

            {!editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Full name" value={current.name} />
                <Info label="Phone" value={current.phone} />
                <Info label="Alternate phone" value={current.alt_phone} />
                <Info label="WhatsApp" value={current.whatsapp} />
                <Info label="Email" value={current.email} />
                <Info label="Nationality" value={current.nationality} />
                <Info label="Budget" value={budget} />
                <Info label="Preferred type" value={current.preferred_type} />
                <Info label="Preferred location" value={current.preferred_location} />
                <Info label="Bedrooms" value={current.bedrooms} />
                <div className="sm:col-span-2">
                  <Info label="Notes" value={current.notes} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelCls}>Full name *</label>
                  <input className={fieldCls} value={form.name} onChange={set("name")} /></div>
                <div><label className={labelCls}>Phone *</label>
                  <input className={fieldCls} value={form.phone} onChange={set("phone")} /></div>
                <div><label className={labelCls}>Alternate phone</label>
                  <input className={fieldCls} value={form.alt_phone} onChange={set("alt_phone")} /></div>
                <div><label className={labelCls}>WhatsApp</label>
                  <input className={fieldCls} value={form.whatsapp} onChange={set("whatsapp")} /></div>
                <div><label className={labelCls}>Email</label>
                  <input className={fieldCls} value={form.email} onChange={set("email")} /></div>
                <div><label className={labelCls}>Nationality</label>
                  <input className={fieldCls} value={form.nationality} onChange={set("nationality")} /></div>
                <div><label className={labelCls}>Budget min (AED)</label>
                  <input type="number" className={fieldCls} value={form.budget_min} onChange={set("budget_min")} /></div>
                <div><label className={labelCls}>Budget max (AED)</label>
                  <input type="number" className={fieldCls} value={form.budget_max} onChange={set("budget_max")} /></div>
                <div><label className={labelCls}>Preferred type</label>
                  <input className={fieldCls} value={form.preferred_type} onChange={set("preferred_type")} /></div>
                <div><label className={labelCls}>Preferred location</label>
                  <input className={fieldCls} value={form.preferred_location} onChange={set("preferred_location")} /></div>
                <div><label className={labelCls}>Bedrooms</label>
                  <input className={fieldCls} value={form.bedrooms} onChange={set("bedrooms")} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Notes</label>
                  <textarea rows={3} className={fieldCls} value={form.notes} onChange={set("notes")} /></div>

                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button onClick={() => { setEditing(false); setError(""); }}
                    className="text-sm text-[#6C7A78] hover:text-[#14201F]">Cancel</button>
                  <button onClick={saveEdit} disabled={busy || !form.name || !form.phone}
                    className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C] disabled:opacity-40">
                    {busy ? "Saving" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-6 rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Activity</h2>
            {localHistory.length === 0 ? (
              <p className="text-xs text-[#6C7A78]">No status changes yet.</p>
            ) : (
              <div className="space-y-4">
                {localHistory.map((h, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1F7A6B]" />
                    <div className="flex-1">
                      <div className="text-sm text-[#14201F]">
                        {h.from_name ? `${h.from_name} -> ${h.to_name}` : h.to_name}
                      </div>
                      {h.notes ? <div className="mt-0.5 text-xs text-[#6C7A78]">{h.notes}</div> : null}
                      <div className="mt-0.5 text-xs text-[#9AA6A4]">
                        {h.by_name || "System"} - {fmtDateTime(h.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: actions */}
        <div className="space-y-6">
          {/* Status change */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Update status</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Status</label>
                <select className={fieldCls} value={statusId} onChange={(e) => setStatusId(e.target.value)}>
                  {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Note (optional)</label>
                <textarea rows={2} className={fieldCls} value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Wants to view Saturday" />
              </div>
              <div>
                <label className={labelCls}>Next follow-up</label>
                <input type="date" className={fieldCls} value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)} />
              </div>
              <button onClick={changeStatus} disabled={statusBusy}
                className="w-full rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40">
                {statusBusy ? "Saving" : "Save update"}
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#14201F]">Details</h2>
            <div className="space-y-3">
              <Info label="Assigned agent" value={current.agent_name || "Unassigned"} />
              <Info label="Source" value={current.source_name} />
              <Info label="Campaign" value={current.campaign} />
              <Info label="Next follow-up" value={fmtDate(current.next_follow_up_at)} />
              <Info label="Created" value={fmtDate(current.created_at)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}