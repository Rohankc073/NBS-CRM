"use client";

import {
    ArrowLeft,
    ArrowRightCircle,
    Mail,
    MessageCircle,
    MessageSquare,
    Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const fieldCls =
  "w-full rounded-lg border border-[#E4E1DA] bg-white px-3.5 py-2.5 text-sm text-[#14201F] outline-none transition-all duration-200 placeholder:text-[#B7BFBD] focus:border-[#1F7A6B] focus:ring-4 focus:ring-[#1F7A6B]/10";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]";

const STATUSES = [
  "New",
  "Contacted",
  "Not Interested",
  "Interested",
  "Callback",
  "Converted",
];

const CHANNELS = [
  { key: "call", label: "Call", icon: Phone, color: "#2563EB" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#15803D" },
  { key: "email", label: "Email", icon: Mail, color: "#C58A12" },
  { key: "sms", label: "SMS", icon: MessageSquare, color: "#7C3AED" },
];

const CHANNEL_LABEL = {
  call: "Called",
  whatsapp: "WhatsApped",
  email: "Emailed",
  sms: "Texted (SMS)",
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

export default function ColdDetailClient({ contact, activity, canManage }) {
  const router = useRouter();

  const [current, setCurrent] = useState(contact);
  const [log, setLog] = useState(activity);
  const [error, setError] = useState("");

  const [status, setStatus] = useState(contact.status);
  const [remark, setRemark] = useState(contact.remark || "");
  const [followUp, setFollowUp] = useState(
    contact.next_follow_up_at ? contact.next_follow_up_at.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);

  const [channelBusy, setChannelBusy] = useState(null);
  const [converting, setConverting] = useState(false);

  const extra =
    current.extra && typeof current.extra === "object" ? current.extra : {};
  const extraKeys = Object.keys(extra);

  async function logChannel(channel) {
    setChannelBusy(channel);
    setError("");
    const res = await fetch(`/api/cold/${contact.id}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const data = await res.json().catch(() => ({}));
    setChannelBusy(null);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setLog([
      {
        channel,
        note: null,
        created_at: new Date().toISOString(),
        by_name: "You",
      },
      ...log,
    ]);
  }

  async function saveStatus() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/cold/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, remark, next_follow_up_at: followUp }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setCurrent({
      ...current,
      status,
      remark,
      next_follow_up_at: followUp || null,
    });
  }

  async function convert() {
    if (
      !confirm(
        "Convert this contact into a pipeline lead? It stays here marked Converted.",
      )
    )
      return;
    setConverting(true);
    setError("");
    const res = await fetch(`/api/cold/${contact.id}/convert`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setConverting(false);
    if (!res.ok) return setError(data.error || "Something went wrong");
    setCurrent({
      ...current,
      status: "Converted",
      converted_lead_id: data.lead.id,
      lead_ref: data.lead.ref_no,
    });
    setStatus("Converted");
  }

  const Info = ({ label, value }) =>
    value ? (
      <div>
        <div className={labelCls}>{label}</div>
        <div className="text-[13.5px] font-medium text-[#14201F]">{value}</div>
      </div>
    ) : null;

  const isConverted = !!current.converted_lead_id;

  const initials = (current.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="p-8 font-sans">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .font-sans { font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rise-in { animation: riseIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C9795] transition hover:text-[#14201F]"
      >
        <ArrowLeft size={13} />
        Back to cold calling
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1F7A6B] to-[#155F53] font-serif text-xl font-semibold text-white shadow-md shadow-[#1F7A6B]/20">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#14201F] sm:text-[26px]">
                {current.name}
              </h1>
              {current.ref_no ? (
                <span className="rounded-full border border-[#E4E1DA] bg-[#F7F5F0] px-2 py-0.5 font-mono text-[11px] text-[#8C9795]">
                  #C{current.ref_no}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-[#8C9795]">
              {current.phone}
              {current.building ? <span className="mx-1.5 text-[#D8D3C6]">•</span> : ""}
              {current.building}
              {current.unit_number ? <span className="mx-1.5 text-[#D8D3C6]">•</span> : ""}
              {current.unit_number ? `Unit ${current.unit_number}` : ""}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#1F7A6B]/25 bg-[#1F7A6B]/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#186459]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A6B]" />
          {current.status}
        </span>
      </div>

      {isConverted ? (
        <div className="rise-in mt-5 flex items-center gap-2 rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/6 px-4 py-3 text-sm text-[#6D28D9]">
          <ArrowRightCircle size={16} className="shrink-0" />
          Converted to lead{current.lead_ref ? ` #${current.lead_ref}` : ""}.{" "}
          {current.converted_lead_id ? (
            <a
              href={`/leads/${current.converted_lead_id}`}
              className="font-semibold underline"
            >
              View lead
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rise-in mt-5 rounded-lg border-l-[3px] border-[#A03A2B] bg-[#FBEEE9] px-4 py-3">
          <p className="text-sm text-[#A03A2B]">{error}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="space-y-6 lg:col-span-2">
          {/* Channel buttons */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Log contact</h2>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.key}
                      onClick={() => logChannel(ch.key)}
                      disabled={channelBusy === ch.key}
                      className="flex flex-col items-center gap-2 rounded-xl border border-[#E4E1DA] py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1F7A6B] hover:bg-[#FBF9F4] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: ch.color + "14" }}
                      >
                        <Icon size={18} style={{ color: ch.color }} />
                      </span>
                      <span className="text-xs font-medium text-[#14201F]">
                        {channelBusy === ch.key ? "…" : ch.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[#AAB3B0]">
                Tap after you contact them — it logs the time.
              </p>
            </div>
          </div>

          {/* Contact info */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Contact details</h2>
            </div>
            <div className="px-6 py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Info label="Name" value={current.name} />
                <Info label="Phone" value={current.phone} />
                <Info label="Mobile" value={current.mobile} />
                <Info label="Secondary mobile" value={current.secondary_mobile} />
                <Info label="Email" value={current.email} />
                <Info label="Building" value={current.building} />
                <Info label="Unit number" value={current.unit_number} />
                <Info label="No of beds" value={current.no_of_beds} />
                <Info label="SQFT" value={current.sqft} />
                <Info label="Batch" value={current.source_batch} />
              </div>
              {extraKeys.length > 0 ? (
                <div className="mt-6 border-t border-[#F0EEE6] pt-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {extraKeys.map((k) => (
                      <Info key={k} label={k} value={String(extra[k])} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Activity log */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Activity</h2>
            </div>
            <div className="px-6 py-6">
              {log.length === 0 ? (
                <p className="text-xs text-[#8C9795]">No contact logged yet.</p>
              ) : (
                <div className="relative space-y-5">
                  <div className="absolute bottom-1 left-[5px] top-1 w-px bg-[#E7E3D9]" />
                  {log.map((a, i) => (
                    <div key={i} className="relative flex gap-3.5">
                      <div className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1F7A6B] ring-[5px] ring-[#1F7A6B]/10" />
                      <div className="flex-1">
                        <div className="text-[13.5px] font-medium text-[#14201F]">
                          {CHANNEL_LABEL[a.channel] || a.channel}
                        </div>
                        {a.note ? (
                          <div className="mt-1 rounded-lg bg-[#F7F5F0] px-3 py-1.5 text-xs text-[#6C7A78]">
                            {a.note}
                          </div>
                        ) : null}
                        <div className="mt-1 text-[11px] text-[#AAB3B0]">
                          {a.by_name || "System"} · {fmtDateTime(a.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Status + remark */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Update</h2>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={fieldCls}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Remark</label>
                <textarea
                  rows={3}
                  className={fieldCls}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Notes from the call"
                />
              </div>
              <div>
                <label className={labelCls}>Next follow-up</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
              </div>
              <button
                onClick={saveStatus}
                disabled={saving}
                className="w-full rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Convert to lead */}
          {!isConverted ? (
            <div className="overflow-hidden rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-b from-[#7C3AED]/5 to-white">
              <div className="px-6 pt-5">
                <h2 className="font-serif text-lg font-semibold text-[#14201F]">Serious buyer?</h2>
                <p className="mb-4 mt-1.5 text-xs text-[#8C9795]">
                  Convert this contact into a full pipeline lead. It moves into
                  Leads with all the tracking, and stays here marked Converted.
                </p>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={convert}
                  disabled={converting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6d28d9] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRightCircle size={16} />
                  {converting ? "Converting…" : "Convert to Lead"}
                </button>
              </div>
            </div>
          ) : null}

          {/* Meta */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
            <div className="border-b border-[#F0EEE6] px-6 py-5">
              <h2 className="font-serif text-lg font-semibold text-[#14201F]">Details</h2>
            </div>
            <div className="space-y-4 px-6 py-6">
              <Info
                label="Assigned agent"
                value={current.agent_name || "Unassigned"}
              />
              <Info
                label="Next follow-up"
                value={fmtDate(current.next_follow_up_at)}
              />
              <Info label="Added" value={fmtDate(current.created_at)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}