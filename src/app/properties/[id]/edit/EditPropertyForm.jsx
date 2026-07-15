"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AMENITIES = [
  "Balcony", "Built-in Wardrobes", "Central A/C", "Covered Parking",
  "Gym", "Maid's Room", "Pool", "Security", "Study", "Concierge",
  "Kids Play Area", "Pets Allowed", "Furnished", "Sea View",
];

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] " +
  "outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1.5 block text-xs font-medium text-[#14201F]";
const fileCls =
  "block w-full text-xs text-[#6C7A78] file:mr-3 file:rounded-md file:border-0 " +
  "file:bg-[#0F1C1E] file:px-3 file:py-2 file:text-xs file:text-[#FBFAF7] hover:file:bg-[#16292C]";

function toForm(p) {
  const v = (x) => (x == null ? "" : String(x));
  const d = p.completion_date
    ? new Date(p.completion_date).toISOString().slice(0, 10)
    : "";
  return {
    name: v(p.name), project_name: v(p.project_name), developer: v(p.developer),
    type_id: v(p.type_id), description: v(p.description),
    bedrooms: v(p.bedrooms), bathrooms: v(p.bathrooms),
    built_up_area: v(p.built_up_area), plot_size: v(p.plot_size), price: v(p.price),
    community: v(p.community), exact_location: v(p.exact_location),
    google_maps_url: v(p.google_maps_url),
    availability: v(p.availability) || "available", completion_date: d,
    assigned_agent_id: v(p.assigned_agent_id),
    owner_name: v(p.owner_name), owner_phone: v(p.owner_phone), owner_email: v(p.owner_email),
  };
}

export default function EditPropertyForm({ property, types, agents, existingMedia }) {
  const router = useRouter();
  const [form, setForm] = useState(toForm(property));
  const [amenities, setAmenities] = useState(
    Array.isArray(property.amenities) ? property.amenities : [],
  );
  const [media, setMedia] = useState(existingMedia);
  const [newImages, setNewImages] = useState([]);
  const [newFloorPlans, setNewFloorPlans] = useState([]);
  const [newBrochures, setNewBrochures] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleAmenity(a) {
    setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  }

  async function removeMedia(mediaId) {
    if (!confirm("Remove this file?")) return;
    const res = await fetch(
      `/api/properties/${property.id}/media/${mediaId}`,
      { method: "DELETE" },
    );
    if (res.ok) setMedia(media.filter((m) => m.id !== mediaId));
    else setError("Could not remove file");
  }

  async function save() {
    setError("");
    setBusy(true);

    // 1. Save the field changes.
    const res = await fetch(`/api/properties/${property.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amenities }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(data.error || "Something went wrong");
    }

    // 2. Upload any newly-added files, per kind. Each is optional —
    //    upload only images, only docs, some of each, or nothing.
    async function uploadGroup(kind, fileList) {
      if (!fileList.length) return;
      const fd = new FormData();
      fd.append("kind", kind);
      for (const f of fileList) fd.append("files", f);
      await fetch(`/api/properties/${property.id}/media`, { method: "POST", body: fd });
    }

    await uploadGroup("image", newImages);
    await uploadGroup("floor_plan", newFloorPlans);
    await uploadGroup("brochure", newBrochures);

    setBusy(false);
    router.push(`/properties/${property.id}`);
    router.refresh();
  }

  const images = media.filter((m) => m.kind === "image");
  const documents = media.filter((m) => m.kind === "floor_plan" || m.kind === "brochure");

  return (
    <div className="mt-6 space-y-6">
      {/* Property information */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Property information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Property name *</label>
            <input className={fieldCls} value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label className={labelCls}>Project name</label>
            <input className={fieldCls} value={form.project_name} onChange={set("project_name")} />
          </div>
          <div>
            <label className={labelCls}>Developer</label>
            <input className={fieldCls} value={form.developer} onChange={set("developer")} />
          </div>
          <div>
            <label className={labelCls}>Property type</label>
            <select className={fieldCls} value={form.type_id} onChange={set("type_id")}>
              <option value="">Select…</option>
              {types.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Specifications</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Bedrooms</label>
            <input type="number" min="0" className={fieldCls} value={form.bedrooms} onChange={set("bedrooms")} /></div>
          <div><label className={labelCls}>Bathrooms</label>
            <input type="number" min="0" className={fieldCls} value={form.bathrooms} onChange={set("bathrooms")} /></div>
          <div><label className={labelCls}>Built-up area (sqft)</label>
            <input type="number" min="0" className={fieldCls} value={form.built_up_area} onChange={set("built_up_area")} /></div>
          <div><label className={labelCls}>Plot size (sqft)</label>
            <input type="number" min="0" className={fieldCls} value={form.plot_size} onChange={set("plot_size")} /></div>
          <div><label className={labelCls}>Price (AED)</label>
            <input type="number" min="0" className={fieldCls} value={form.price} onChange={set("price")} /></div>
          <div><label className={labelCls}>Availability</label>
            <select className={fieldCls} value={form.availability} onChange={set("availability")}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="off_market">Off market</option>
            </select></div>
          <div><label className={labelCls}>Completion date</label>
            <input type="date" className={fieldCls} value={form.completion_date} onChange={set("completion_date")} /></div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Community</label>
            <input className={fieldCls} value={form.community} onChange={set("community")} /></div>
          <div><label className={labelCls}>Exact location</label>
            <input className={fieldCls} value={form.exact_location} onChange={set("exact_location")} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Google Maps link</label>
            <input className={fieldCls} value={form.google_maps_url} onChange={set("google_maps_url")} /></div>
        </div>
      </div>

      {/* Images: existing (removable) + add unlimited */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Images</h2>
        {images.length ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((m) => (
              <div key={m.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.file_path} alt="" className="h-24 w-full rounded-md border border-[#E4E1DA] object-cover" />
                <button
                  onClick={() => removeMedia(m.id)}
                  className="absolute right-1 top-1 rounded-full bg-[#A03A2B] px-1.5 leading-5 text-xs text-white"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6C7A78]">No images yet.</p>
        )}
        <div className="mt-4">
          <label className={labelCls}>Add images (upload as many as you like)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setNewImages(Array.from(e.target.files))}
            className={fileCls}
          />
          {newImages.length ? (
            <p className="mt-1 text-xs text-[#1F7A6B]">{newImages.length} to upload</p>
          ) : null}
        </div>
      </div>

      {/* Documents: floor plans + brochures — open, remove, add */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Documents</h2>
        {documents.length ? (
          <div className="space-y-2">
            {documents.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-[#E4E1DA] px-3 py-2">
                <a
                  href={m.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#1F7A6B] hover:underline"
                >
                  {m.kind === "floor_plan" ? "Floor plan" : "Brochure"} — {m.original_name}
                </a>
                <button
                  onClick={() => removeMedia(m.id)}
                  className="text-xs text-[#6C7A78] hover:text-[#A03A2B]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#6C7A78]">No documents yet.</p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Add floor plans</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(e) => setNewFloorPlans(Array.from(e.target.files))}
              className={fileCls}
            />
            {newFloorPlans.length ? (
              <p className="mt-1 text-xs text-[#1F7A6B]">{newFloorPlans.length} to upload</p>
            ) : null}
          </div>
          <div>
            <label className={labelCls}>Add brochures (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setNewBrochures(Array.from(e.target.files))}
              className={fileCls}
            />
            {newBrochures.length ? (
              <p className="mt-1 text-xs text-[#1F7A6B]">{newBrochures.length} to upload</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <button key={a} type="button" onClick={() => toggleAmenity(a)}
              className={"rounded-full border px-3 py-1 text-xs transition " +
                (amenities.includes(a)
                  ? "border-[#1F7A6B] bg-[#1F7A6B] text-white"
                  : "border-[#E4E1DA] bg-white text-[#6C7A78] hover:border-[#1F7A6B]")}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Description</h2>
        <textarea rows={4} className={fieldCls} value={form.description} onChange={set("description")} />
      </div>

      {/* Assignment & owner */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Assignment & owner</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Assigned agent</label>
            <select className={fieldCls} value={form.assigned_agent_id} onChange={set("assigned_agent_id")}>
              <option value="">Unassigned</option>
              {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select></div>
          <div><label className={labelCls}>Owner name</label>
            <input className={fieldCls} value={form.owner_name} onChange={set("owner_name")} /></div>
          <div><label className={labelCls}>Owner phone</label>
            <input className={fieldCls} value={form.owner_phone} onChange={set("owner_phone")} /></div>
          <div><label className={labelCls}>Owner email</label>
            <input className={fieldCls} value={form.owner_email} onChange={set("owner_email")} /></div>
        </div>
      </div>

      {error ? (
        <p className="border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
      ) : null}

      <div className="flex justify-end gap-3 pb-12">
        <button
          onClick={() => router.push(`/properties/${property.id}`)}
          className="text-sm text-[#6C7A78] hover:text-[#14201F]"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !form.name}
          className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}