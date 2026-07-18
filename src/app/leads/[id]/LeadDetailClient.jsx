"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                     */
/* ------------------------------------------------------------------ */
const fieldCls =
  "w-full rounded-lg border border-[#E4E1DA] bg-white px-3.5 py-2.5 text-sm text-[#14201F] outline-none transition-all duration-200 placeholder:text-[#B7BFBD] focus:border-[#1F7A6B] focus:ring-4 focus:ring-[#1F7A6B]/10";
const labelCls =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8C9795]";

function toForm(l) {
  const v = (x) => (x == null ? "" : String(x));
  return {
    name: v(l.name),
    phone: v(l.phone),
    alt_phone: v(l.alt_phone),
    whatsapp: v(l.whatsapp),
    email: v(l.email),
    nationality: v(l.nationality),
    budget_min: v(l.budget_min),
    budget_max: v(l.budget_max),
    preferred_type: v(l.preferred_type),
    preferred_location: v(l.preferred_location),
    bedrooms: v(l.bedrooms),
    notes: v(l.notes),
  };
}

// Turn "when_do_you_plan_to_finalise_the_purchase?" into a readable label.
function prettyLabel(key) {
  return key
    .replace(/[_?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

// extra may arrive as an object (JSONB) or a JSON string - handle both.
function parseExtra(extra) {
  if (!extra) return {};
  if (typeof extra === "object") return extra;
  try {
    return JSON.parse(extra);
  } catch {
    return {};
  }
}

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

/* ---- inline icons (purely decorative, no external deps) ---- */
const IconArrowLeft = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l6 6m-6-6l6-6" />
  </svg>
);
const IconPencil = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.5a1.9 1.9 0 013 2.3L8.5 18l-4 1 1-4L16.5 4.5z" />
  </svg>
);
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconClose = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);
const IconUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path strokeLinecap="round" d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);
const IconTag = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinejoin="round" d="M11.5 4H6a2 2 0 00-2 2v5.5a2 2 0 00.6 1.4l8 8a2 2 0 002.8 0l5.5-5.5a2 2 0 000-2.8l-8-8A2 2 0 0011.5 4z" />
    <circle cx="8.2" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
const IconFlag = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4m0 1.5c2-1.3 4.5-1.3 7 0s5 1.3 7 0V13c-2 1.3-4.5 1.3-7 0s-5-1.3-7 0" />
  </svg>
);
const IconCalendar = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path strokeLinecap="round" d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
);
const IconPhone = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 10.8c1.3 2.5 3.3 4.6 5.9 5.9l2-2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C11.4 20 4 12.6 4 3.5c0-.6.4-1 1-1h2.9c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-2 2z" />
  </svg>
);
const IconMessageCircle = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.5 0 2.1 1 4 2.6 5.4-.1.9-.5 2-1.1 2.9 1.3-.1 2.6-.6 3.6-1.3 1 .3 2.2.5 3.4.5 4.7 0 8.5-3.4 8.5-7.5S16.7 3.5 12 3.5z" />
  </svg>
);
const IconMail = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5l8 6.5 8-6.5" />
  </svg>
);
const IconGlobe = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path strokeLinecap="round" d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.3 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.3-3.3-8.5S9.8 5.8 12 3.5z" />
  </svg>
);
const IconHome = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 11l8-7 8 7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.5V19a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1V9.5" />
  </svg>
);
const IconMapPin = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.2 7-11.5A7 7 0 105 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </svg>
);
const IconBed = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 18v2M21 18v2M3 13h18" />
    <circle cx="7" cy="11" r="1.4" />
  </svg>
);
const IconNotebook = (p) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2" />
    <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);
const IconSparkle = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" />
  </svg>
);

/** label + icon-affixed input; purely presentational, same value/onChange as a plain input */
function IconInput({ icon, label, required, className = "", ...inputProps }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required ? <span className="ml-0.5 text-[#C8763F]">*</span> : null}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAB3B0]">
          {icon}
        </span>
        <input {...inputProps} className={`${fieldCls} pl-10 ${className}`} />
      </div>
    </div>
  );
}

/** small uppercase section header used to group the edit form */
function FieldGroup({ icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1F7A6B]/10 text-[#1F7A6B]">
        <span className="h-3 w-3">{icon}</span>
      </span>
      <span className="font-serif text-[15px] font-semibold text-[#14201F]">{title}</span>
    </div>
  );
}

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

  const extra = parseExtra(current.extra);
  const extraKeys = Object.keys(extra);

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
      body: JSON.stringify({
        status_id: statusId,
        note,
        next_follow_up_at: followUp,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setStatusBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong");

    setStatusName(data.status_name);
    const toName =
      statuses.find((s) => s.id === statusId)?.name || data.status_name;
    setLocalHistory([
      {
        created_at: new Date().toISOString(),
        notes: note || null,
        from_name: statusName,
        to_name: toName,
        by_name: "You",
      },
      ...localHistory,
    ]);
    setNote("");
    router.refresh();
  }

  const budget =
    current.budget_min || current.budget_max
      ? `AED ${Number(current.budget_min || 0).toLocaleString("en-AE")} - ${Number(current.budget_max || 0).toLocaleString("en-AE")}`
      : null;

  const initials = (current.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const MetaRow = ({ icon, label, value, href }) =>
    value ? (
      <div className="group flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F1EB] text-[#7B8683] transition-colors duration-200 group-hover:bg-[#1F7A6B] group-hover:text-white">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <div className={labelCls}>{label}</div>
          {href ? (
            <a
              href={href}
              className="block truncate text-[13.5px] font-medium text-[#14201F] transition hover:text-[#1F7A6B] hover:underline"
            >
              {value}
            </a>
          ) : (
            <div className="truncate text-[13.5px] font-medium text-[#14201F]">{value}</div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap");
        .font-serif {
          font-family: "Fraunces", ui-serif, Georgia, serif;
          font-optical-sizing: auto;
        }
        .font-sans {
          font-family: "Work Sans", ui-sans-serif, system-ui, sans-serif;
        }
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .rise-in {
          animation: riseIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="font-sans">
        {/* ---------------- Header ---------------- */}
        <div className="relative overflow-hidden border-b border-[#E7E3D9] bg-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              background:
                "radial-gradient(55% 100% at 8% 0%, rgba(31,122,107,0.08) 0%, transparent 65%), radial-gradient(45% 80% at 100% 100%, rgba(200,118,63,0.06) 0%, transparent 65%)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-6 sm:px-8">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C9795] transition hover:text-[#14201F]"
            >
              <IconArrowLeft className="h-3.5 w-3.5" />
              Back to leads
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1F7A6B] to-[#155F53] font-serif text-xl font-semibold text-white shadow-md shadow-[#1F7A6B]/20">
                  {initials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#14201F] sm:text-[28px]">
                      {current.name}
                    </h1>
                    {current.ref_no ? (
                      <span className="rounded-full border border-[#E4E1DA] bg-[#F7F5F0] px-2 py-0.5 font-mono text-[11px] text-[#8C9795]">
                        #{current.ref_no}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] text-[#8C9795]">
                    {current.phone}
                    {current.source_name ? (
                      <span className="mx-1.5 text-[#D8D3C6]">•</span>
                    ) : null}
                    {current.source_name}
                    {current.campaign ? (
                      <span className="mx-1.5 text-[#D8D3C6]">•</span>
                    ) : null}
                    {current.campaign}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full border border-[#1F7A6B]/25 bg-[#1F7A6B]/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#186459]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1F7A6B] opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1F7A6B]" />
                </span>
                {statusName || "New"}
              </span>
            </div>
          </div>
        </div>

        {/* ---------------- Body ---------------- */}
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-8">
          {error ? (
            <div className="rise-in mb-6 flex items-start gap-2.5 rounded-xl border border-[#E8B4A2] bg-[#FBEEE9] px-4 py-3 text-sm text-[#A03A2B]">
              <IconClose className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT: lead info (2 cols) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rise-in overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
                <div className="flex items-center justify-between border-b border-[#F0EEE6] px-6 py-5">
                  <h2 className="font-serif text-lg font-semibold text-[#14201F]">
                    Lead information
                  </h2>
                  {!editing ? (
                    <button
                      onClick={() => {
                        setForm(toForm(current));
                        setEditing(true);
                        setError("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1DA] px-3.5 py-1.5 text-xs font-medium text-[#1F7A6B] transition hover:border-[#1F7A6B] hover:bg-[#1F7A6B]/5"
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : null}
                </div>

                <div className="px-6 py-6">
                  {!editing ? (
                    <div className="space-y-7">
                      {/* Contact */}
                      <div>
                        <FieldGroup icon={<IconUser className="h-full w-full" />} title="Contact" />
                        <div className="grid gap-5 sm:grid-cols-2">
                          <MetaRow icon={<IconUser className="h-3.5 w-3.5" />} label="Full name" value={current.name} />
                          <MetaRow
                            icon={<IconPhone className="h-3.5 w-3.5" />}
                            label="Phone"
                            value={current.phone}
                            href={current.phone ? `tel:${current.phone}` : null}
                          />
                          <MetaRow
                            icon={<IconPhone className="h-3.5 w-3.5" />}
                            label="Alternate phone"
                            value={current.alt_phone}
                            href={current.alt_phone ? `tel:${current.alt_phone}` : null}
                          />
                          <MetaRow
                            icon={<IconMessageCircle className="h-3.5 w-3.5" />}
                            label="WhatsApp"
                            value={current.whatsapp}
                          />
                          <MetaRow
                            icon={<IconMail className="h-3.5 w-3.5" />}
                            label="Email"
                            value={current.email}
                            href={current.email ? `mailto:${current.email}` : null}
                          />
                          <MetaRow icon={<IconGlobe className="h-3.5 w-3.5" />} label="Nationality" value={current.nationality} />
                        </div>
                      </div>

                      {/* Property preferences */}
                      {(budget || current.preferred_type || current.preferred_location || current.bedrooms) ? (
                        <div className="border-t border-[#F0EEE6] pt-6">
                          <FieldGroup icon={<IconHome className="h-full w-full" />} title="Property preferences" />
                          <div className="grid gap-5 sm:grid-cols-2">
                            {budget ? (
                              <div className="sm:col-span-2">
                                <div className={labelCls}>Budget</div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-4 py-1.5 font-serif text-[15px] font-semibold text-white shadow-sm">
                                  <IconSparkle className="h-3 w-3 text-[#9EE8D5]" />
                                  {budget}
                                </span>
                              </div>
                            ) : null}
                            <MetaRow icon={<IconHome className="h-3.5 w-3.5" />} label="Preferred type" value={current.preferred_type} />
                            <MetaRow icon={<IconMapPin className="h-3.5 w-3.5" />} label="Preferred location" value={current.preferred_location} />
                            <MetaRow icon={<IconBed className="h-3.5 w-3.5" />} label="Bedrooms" value={current.bedrooms} />
                          </div>
                        </div>
                      ) : null}

                      {/* Notes */}
                      {current.notes ? (
                        <div className="border-t border-[#F0EEE6] pt-6">
                          <FieldGroup icon={<IconNotebook className="h-full w-full" />} title="Notes" />
                          <div className="rounded-xl border-l-[3px] border-[#C8763F] bg-[#FBF7EF] px-4 py-3.5 text-sm leading-relaxed text-[#14201F]">
                            {current.notes}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-7">
                      {/* Contact */}
                      <div>
                        <FieldGroup icon={<IconUser className="h-full w-full" />} title="Contact" />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <IconInput
                            icon={<IconUser className="h-4 w-4" />}
                            label="Full name"
                            required
                            value={form.name}
                            onChange={set("name")}
                          />
                          <IconInput
                            icon={<IconPhone className="h-4 w-4" />}
                            label="Phone"
                            required
                            value={form.phone}
                            onChange={set("phone")}
                          />
                          <IconInput
                            icon={<IconPhone className="h-4 w-4" />}
                            label="Alternate phone"
                            value={form.alt_phone}
                            onChange={set("alt_phone")}
                          />
                          <IconInput
                            icon={<IconMessageCircle className="h-4 w-4" />}
                            label="WhatsApp"
                            value={form.whatsapp}
                            onChange={set("whatsapp")}
                          />
                          <IconInput
                            icon={<IconMail className="h-4 w-4" />}
                            label="Email"
                            value={form.email}
                            onChange={set("email")}
                          />
                          <IconInput
                            icon={<IconGlobe className="h-4 w-4" />}
                            label="Nationality"
                            value={form.nationality}
                            onChange={set("nationality")}
                          />
                        </div>
                      </div>

                      {/* Property preferences */}
                      <div className="border-t border-[#F0EEE6] pt-6">
                        <FieldGroup icon={<IconHome className="h-full w-full" />} title="Property preferences" />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Budget range (AED)</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#AAB3B0]">
                                  AED
                                </span>
                                <input
                                  type="number"
                                  placeholder="Min"
                                  className={`${fieldCls} pl-12`}
                                  value={form.budget_min}
                                  onChange={set("budget_min")}
                                />
                              </div>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#AAB3B0]">
                                  AED
                                </span>
                                <input
                                  type="number"
                                  placeholder="Max"
                                  className={`${fieldCls} pl-12`}
                                  value={form.budget_max}
                                  onChange={set("budget_max")}
                                />
                              </div>
                            </div>
                          </div>
                          <IconInput
                            icon={<IconHome className="h-4 w-4" />}
                            label="Preferred type"
                            value={form.preferred_type}
                            onChange={set("preferred_type")}
                          />
                          <IconInput
                            icon={<IconMapPin className="h-4 w-4" />}
                            label="Preferred location"
                            value={form.preferred_location}
                            onChange={set("preferred_location")}
                          />
                          <IconInput
                            icon={<IconBed className="h-4 w-4" />}
                            label="Bedrooms"
                            value={form.bedrooms}
                            onChange={set("bedrooms")}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="border-t border-[#F0EEE6] pt-6">
                        <FieldGroup icon={<IconNotebook className="h-full w-full" />} title="Notes" />
                        <textarea
                          rows={3}
                          className={fieldCls}
                          value={form.notes}
                          onChange={set("notes")}
                          placeholder="Anything else worth remembering about this lead..."
                        />
                      </div>

                      <div className="flex justify-end gap-3 border-t border-[#F0EEE6] pt-6">
                        <button
                          onClick={() => {
                            setEditing(false);
                            setError("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E1DA] px-4 py-2 text-sm text-[#6C7A78] transition hover:border-[#14201F] hover:text-[#14201F]"
                        >
                          <IconClose className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={busy || !form.name || !form.phone}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1C1E] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#16292C] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <IconCheck className="h-3.5 w-3.5" />
                          {busy ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign responses (from the lead's extra data) */}
              {extraKeys.length > 0 ? (
                <div className="rise-in overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
                  <div className="border-b border-[#F0EEE6] px-6 py-5">
                    <h2 className="font-serif text-lg font-semibold text-[#14201F]">
                      Campaign responses
                    </h2>
                  </div>
                  <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                    {extraKeys.map((key) => (
                      <div key={key}>
                        <div className={labelCls}>{prettyLabel(key)}</div>
                        <div className="text-[13.5px] font-medium text-[#14201F]">
                          {String(extra[key])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Timeline */}
              <div className="rise-in overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
                <div className="border-b border-[#F0EEE6] px-6 py-5">
                  <h2 className="font-serif text-lg font-semibold text-[#14201F]">Activity</h2>
                </div>
                <div className="px-6 py-6">
                  {localHistory.length === 0 ? (
                    <p className="text-xs text-[#8C9795]">No status changes yet.</p>
                  ) : (
                    <div className="relative space-y-6">
                      <div className="absolute bottom-1 left-[5px] top-1 w-px bg-[#E7E3D9]" />
                      {localHistory.map((h, i) => (
                        <div key={i} className="relative flex gap-3.5">
                          <div className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1F7A6B] ring-[5px] ring-[#1F7A6B]/10" />
                          <div className="flex-1">
                            <div className="text-[13.5px] font-medium text-[#14201F]">
                              {h.from_name ? (
                                <>
                                  {h.from_name}
                                  <span className="mx-1.5 text-[#1F7A6B]">→</span>
                                  {h.to_name}
                                </>
                              ) : (
                                h.to_name
                              )}
                            </div>
                            {h.notes ? (
                              <div className="mt-1 rounded-lg bg-[#F7F5F0] px-3 py-1.5 text-xs text-[#6C7A78]">
                                {h.notes}
                              </div>
                            ) : null}
                            <div className="mt-1 text-[11px] text-[#AAB3B0]">
                              {h.by_name || "System"} · {fmtDateTime(h.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: actions */}
            <div className="space-y-6">
              {/* Status change */}
              <div className="rise-in overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
                <div className="border-b border-[#F0EEE6] px-6 py-5">
                  <h2 className="font-serif text-lg font-semibold text-[#14201F]">Update status</h2>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <div>
                    <label className={labelCls}>Status</label>
                    <SelectWrap value={statusId} onChange={(e) => setStatusId(e.target.value)}>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </SelectWrap>
                  </div>
                  <div>
                    <label className={labelCls}>Note (optional)</label>
                    <textarea
                      rows={2}
                      className={fieldCls}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Wants to view Saturday"
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
                    onClick={changeStatus}
                    disabled={statusBusy}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#1F7A6B] to-[#186459] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                    {statusBusy ? "Saving…" : "Save update"}
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="rise-in overflow-hidden rounded-2xl border border-[#E7E3D9] bg-white shadow-[0_1px_2px_rgba(15,28,30,0.04),0_12px_28px_-16px_rgba(15,28,30,0.12)]">
                <div className="border-b border-[#F0EEE6] px-6 py-5">
                  <h2 className="font-serif text-lg font-semibold text-[#14201F]">Details</h2>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <MetaRow
                    icon={<IconUser className="h-3.5 w-3.5" />}
                    label="Assigned agent"
                    value={current.agent_name || "Unassigned"}
                  />
                  <MetaRow icon={<IconTag className="h-3.5 w-3.5" />} label="Source" value={current.source_name} />
                  <MetaRow icon={<IconFlag className="h-3.5 w-3.5" />} label="Campaign" value={current.campaign} />
                  <MetaRow
                    icon={<IconCalendar className="h-3.5 w-3.5" />}
                    label="Next follow-up"
                    value={fmtDate(current.next_follow_up_at)}
                  />
                  <MetaRow
                    icon={<IconCalendar className="h-3.5 w-3.5" />}
                    label="Created"
                    value={fmtDate(current.created_at)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}