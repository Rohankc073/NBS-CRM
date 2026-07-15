"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AMENITIES = [
  "Balcony", "Built-in Wardrobes", "Central A/C", "Covered Parking",
  "Gym", "Maid's Room", "Pool", "Security", "Study", "Concierge",
  "Kids Play Area", "Pets Allowed", "Furnished", "Sea View",
];

const EMPTY = {
  name: "", project_name: "", developer: "", type_id: "", description: "",
  bedrooms: "", bathrooms: "", built_up_area: "", plot_size: "", price: "",
  community: "", exact_location: "", google_maps_url: "",
  availability: "available", completion_date: "", assigned_agent_id: "",
  owner_name: "", owner_phone: "", owner_email: "",
};

const fieldCls =
  "w-full rounded-md border border-[#E4E1DA] bg-white px-3 py-2 text-sm text-[#14201F] " +
  "outline-none transition focus:border-[#1F7A6B] focus:ring-2 focus:ring-[#1F7A6B]/20";
const labelCls = "mb-1.5 block text-xs font-medium text-[#14201F]";
const fileCls =
  "block w-full text-xs text-[#6C7A78] file:mr-3 file:rounded-md file:border-0 " +
  "file:bg-[#0F1C1E] file:px-3 file:py-2 file:text-xs file:text-[#FBFAF7] hover:file:bg-[#16292C]";

export default function PropertyForm({ types, agents }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [brochures, setBrochures] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleAmenity(a) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  async function submit() {
    setError("");
    setBusy(true);

    // Step 1: create the property record.
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amenities }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setBusy(false);
      return setError(data.error || "Something went wrong");
    }

    const propertyId = data.property.id;

    // Step 2: upload each file group against the new id. Files can't go in
    // JSON, so these are separate multipart requests.
    async function uploadGroup(kind, fileList) {
      if (!fileList.length) return;
      const fd = new FormData();
      fd.append("kind", kind);
      for (const f of fileList) fd.append("files", f);
      // No Content-Type header — the browser sets the multipart boundary.
      await fetch(`/api/properties/${propertyId}/media`, {
        method: "POST",
        body: fd,
      });
    }

    try {
      await uploadGroup("image", images);
      await uploadGroup("floor_plan", floorPlans);
      await uploadGroup("brochure", brochures);
    } catch {
      // Property saved but a file failed — don't block; files can be added later.
    }

    setBusy(false);
    router.push("/properties");
    router.refresh();
  }

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
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Specifications</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bedrooms</label>
            <input type="number" min="0" className={fieldCls} value={form.bedrooms} onChange={set("bedrooms")} />
          </div>
          <div>
            <label className={labelCls}>Bathrooms</label>
            <input type="number" min="0" className={fieldCls} value={form.bathrooms} onChange={set("bathrooms")} />
          </div>
          <div>
            <label className={labelCls}>Built-up area (sqft)</label>
            <input type="number" min="0" className={fieldCls} value={form.built_up_area} onChange={set("built_up_area")} />
          </div>
          <div>
            <label className={labelCls}>Plot size (sqft)</label>
            <input type="number" min="0" className={fieldCls} value={form.plot_size} onChange={set("plot_size")} />
          </div>
          <div>
            <label className={labelCls}>Price (AED)</label>
            <input type="number" min="0" className={fieldCls} value={form.price} onChange={set("price")} />
          </div>
          <div>
            <label className={labelCls}>Availability</label>
            <select className={fieldCls} value={form.availability} onChange={set("availability")}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="off_market">Off market</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Completion date</label>
            <input type="date" className={fieldCls} value={form.completion_date} onChange={set("completion_date")} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Community</label>
            <input className={fieldCls} value={form.community} onChange={set("community")} />
          </div>
          <div>
            <label className={labelCls}>Exact location</label>
            <input className={fieldCls} value={form.exact_location} onChange={set("exact_location")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Google Maps link</label>
            <input className={fieldCls} value={form.google_maps_url} onChange={set("google_maps_url")} />
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Media</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Images (JPG/PNG)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files))}
              className={fileCls}
            />
            {images.length ? (
              <p className="mt-1 text-xs text-[#1F7A6B]">{images.length} selected</p>
            ) : null}
          </div>

          <div>
            <label className={labelCls}>Floor plan</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(e) => setFloorPlans(Array.from(e.target.files))}
              className={fileCls}
            />
            {floorPlans.length ? (
              <p className="mt-1 text-xs text-[#1F7A6B]">{floorPlans.length} selected</p>
            ) : null}
          </div>

          <div>
            <label className={labelCls}>Brochure (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setBrochures(Array.from(e.target.files))}
              className={fileCls}
            />
            {brochures.length ? (
              <p className="mt-1 text-xs text-[#1F7A6B]">{brochures.length} selected</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Description</h2>
        <textarea
          rows={4}
          className={fieldCls}
          value={form.description}
          onChange={set("description")}
          placeholder="Describe the property…"
        />
      </div>

      {/* Assignment & owner */}
      <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-[#14201F]">Assignment & owner</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Assigned agent</label>
            <select className={fieldCls} value={form.assigned_agent_id} onChange={set("assigned_agent_id")}>
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Owner name</label>
            <input className={fieldCls} value={form.owner_name} onChange={set("owner_name")} />
          </div>
          <div>
            <label className={labelCls}>Owner phone</label>
            <input className={fieldCls} value={form.owner_phone} onChange={set("owner_phone")} />
          </div>
          <div>
            <label className={labelCls}>Owner email</label>
            <input className={fieldCls} value={form.owner_email} onChange={set("owner_email")} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="border-l-2 border-[#A03A2B] pl-3 text-sm text-[#A03A2B]">{error}</p>
      ) : null}

      <div className="flex justify-end gap-3 pb-12">
        <button
          onClick={() => router.push("/properties")}
          className="text-sm text-[#6C7A78] hover:text-[#14201F]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy || !form.name}
          className="rounded-md bg-[#0F1C1E] px-4 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save property"}
        </button>
      </div>
    </div>
  );
}