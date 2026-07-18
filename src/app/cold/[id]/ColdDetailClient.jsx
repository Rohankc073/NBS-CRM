"use client";

import {
    ArrowRightCircle,
    Mail,
    MessageCircle,
    MessageSquare,
    Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1 block text-xs font-medium text-[#6C7A78]";

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
        <div className="text-sm text-[#14201F]">{value}</div>
      </div>
    ) : null;

  const isConverted = !!current.converted_lead_id;

  return (
    <div className="p-8">
      <button
        onClick={() => router.back()}
        className="text-xs text-[#6C7A78] hover:text-[#14201F]"
      >
        Back to cold calling
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">
              {current.name}
            </h1>
            {current.ref_no ? (
              <span className="font-mono text-xs text-[#9AA6A4]">
                #C{current.ref_no}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#6C7A78]">
            {current.phone}
            {current.building ? ` - ${current.building}` : ""}
            {current.unit_number ? ` - Unit ${current.unit_number}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-[#1F7A6B]/30 bg-[#1F7A6B]/10 px-3 py-1 text-xs font-medium text-[#1F7A6B]">
          {current.status}
        </span>
      </div>

      {isConverted ? (
        <div className="mt-4 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-3 text-sm text-[#6D28D9]">
          Converted to lead{current.lead_ref ? ` #${current.lead_ref}` : ""}.{" "}
          {current.converted_lead_id ? (
            <a
              href={`/leads/${current.converted_lead_id}`}
              className="font-medium underline"
            >
              View lead
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Channel buttons */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
              Log contact
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.key}
                    onClick={() => logChannel(ch.key)}
                    disabled={channelBusy === ch.key}
                    className="flex flex-col items-center gap-2 rounded-lg border border-[#E4E1DA] py-4 transition hover:border-[#1F7A6B] hover:bg-[#FBFAF7] disabled:opacity-40"
                  >
                    <Icon size={22} style={{ color: ch.color }} />
                    <span className="text-xs font-medium text-[#14201F]">
                      {channelBusy === ch.key ? "..." : ch.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#9AA6A4]">
              Tap after you contact them - it logs the time.
            </p>
          </div>

          {/* Contact info */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
              Contact details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="mt-4 border-t border-[#F0EEE9] pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {extraKeys.map((k) => (
                    <Info key={k} label={k} value={String(extra[k])} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Activity log */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
              Activity
            </h2>
            {log.length === 0 ? (
              <p className="text-xs text-[#6C7A78]">No contact logged yet.</p>
            ) : (
              <div className="space-y-4">
                {log.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1F7A6B]" />
                    <div className="flex-1">
                      <div className="text-sm text-[#14201F]">
                        {CHANNEL_LABEL[a.channel] || a.channel}
                      </div>
                      {a.note ? (
                        <div className="mt-0.5 text-xs text-[#6C7A78]">
                          {a.note}
                        </div>
                      ) : null}
                      <div className="mt-0.5 text-xs text-[#9AA6A4]">
                        {a.by_name || "System"} - {fmtDateTime(a.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* Status + remark */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
              Update
            </h2>
            <div className="space-y-3">
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
                className="w-full rounded-md bg-[#1F7A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a6659] disabled:opacity-40"
              >
                {saving ? "Saving" : "Save"}
              </button>
            </div>
          </div>

          {/* Convert to lead */}
          {!isConverted ? (
            <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-[#14201F]">
                Serious buyer?
              </h2>
              <p className="mb-3 text-xs text-[#6C7A78]">
                Convert this contact into a full pipeline lead. It moves into
                Leads with all the tracking, and stays here marked Converted.
              </p>
              <button
                onClick={convert}
                disabled={converting}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-40"
              >
                <ArrowRightCircle size={16} />{" "}
                {converting ? "Converting" : "Convert to Lead"}
              </button>
            </div>
          ) : null}

          {/* Meta */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#14201F]">
              Details
            </h2>
            <div className="space-y-3">
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
