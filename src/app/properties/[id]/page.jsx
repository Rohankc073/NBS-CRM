import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import CrmShell from "@/components/CrmShell";
import BackButton from "@/components/BackButton";
import Link from "next/link";

function priceShort(n) {
  if (n == null) return "Price on request";
  if (n >= 1_000_000) return "AED " + (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1_000) return "AED " + Math.round(n / 1000) + "K";
  return "AED " + n;
}

const GRADIENTS = [
  ["#4A5A73", "#6B7B94"], ["#2C7A9E", "#3E9BB8"], ["#B08A3E", "#C9A44E"],
  ["#5B3A73", "#7C5494"], ["#2E7D52", "#3E9B6B"], ["#8A5A3E", "#A8744E"],
  ["#3E5A8A", "#5478A8"], ["#7A3A4E", "#9B546B"],
];
function gradientFor(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}
function initials(name) {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default async function PropertyDetail({ params }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { id } = await params;

  const p = await queryOne(
    `SELECT p.*, t.name AS type_name,
            u.name AS created_by_name, a.name AS agent_name
     FROM properties p
     LEFT JOIN property_types t ON t.id = p.type_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN users a ON a.id = p.assigned_agent_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  );
  if (!p) notFound();

  const isReviewer = me.role === "super_admin" || me.role === "admin";
  if (!isReviewer && p.approval_status !== "approved" && p.created_by !== me.id) {
    redirect("/properties");
  }

  const media = await query(
    `SELECT id, kind, file_path, original_name FROM property_media
     WHERE property_id = $1 ORDER BY kind, sort_order`,
    [id],
  );

  const images = media.filter((m) => m.kind === "image");
  const floorPlans = media.filter((m) => m.kind === "floor_plan");
  const brochures = media.filter((m) => m.kind === "brochure");
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const [c1, c2] = gradientFor(p.id);
  const hero = images[0];
  const avail = (p.availability || "available").replace("_", " ");

  const Spec = ({ label, value }) =>
    value != null && value !== "" ? (
      <div>
        <div className="text-xs text-[#9AA6A4]">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-[#14201F]">{value}</div>
      </div>
    ) : null;

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm">
          <BackButton label="← Properties" fallback="/properties" />
          <span className="text-[#9AA6A4]">/</span>
          <span className="font-medium text-[#14201F]">{p.name}</span>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          {/* LEFT: hero + specs + amenities */}
          <div className="lg:col-span-2">
            {/* Hero */}
            <div
              className="relative h-80 overflow-hidden rounded-xl"
              style={hero ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {hero ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero.file_path} alt={p.name} className="h-full w-full object-cover" />
              ) : null}
              <span className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                {p.type_name || "Property"}{p.community ? ` - ${p.community}` : ""}
              </span>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {images.slice(1, 5).map((img) => (
                  <a key={img.id} href={img.file_path} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.file_path} alt="" className="h-20 w-full rounded-lg border border-[#E4E1DA] object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            {/* Specifications */}
            <div className="mt-6 rounded-xl border border-[#E4E1DA] bg-white p-6">
              <h2 className="text-sm font-semibold text-[#14201F]">Specifications</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-4">
                <Spec label="Bedrooms" value={p.bedrooms} />
                <Spec label="Bathrooms" value={p.bathrooms} />
                <Spec label="Built-up Area" value={p.built_up_area ? `${Number(p.built_up_area).toLocaleString()} sqft` : null} />
                <Spec label="Type" value={p.type_name} />
                <Spec label="Developer" value={p.developer} />
                <Spec label="Plot Size" value={p.plot_size ? `${Number(p.plot_size).toLocaleString()} sqft` : null} />
                <Spec label="Availability" value={<span className="capitalize">{avail}</span>} />
                <Spec label="Location" value={p.exact_location} />
              </div>
            </div>

            {/* Amenities */}
            {amenities.length ? (
              <div className="mt-6 rounded-xl border border-[#E4E1DA] bg-white p-6">
                <h2 className="text-sm font-semibold text-[#14201F]">Amenities</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="rounded-lg border border-[#E4E1DA] px-3 py-1.5 text-xs text-[#6C7A78]">{a}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Description */}
            {p.description ? (
              <div className="mt-6 rounded-xl border border-[#E4E1DA] bg-white p-6">
                <h2 className="text-sm font-semibold text-[#14201F]">Description</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#14201F]">{p.description}</p>
              </div>
            ) : null}

            {/* Documents */}
            {(floorPlans.length || brochures.length) ? (
              <div className="mt-6 rounded-xl border border-[#E4E1DA] bg-white p-6">
                <h2 className="text-sm font-semibold text-[#14201F]">Documents</h2>
                <div className="mt-3 space-y-2">
                  {floorPlans.map((f) => (
                    <a key={f.id} href={f.file_path} target="_blank" rel="noreferrer"
                       className="block text-sm text-[#1F7A6B] hover:underline">Floor plan - {f.original_name}</a>
                  ))}
                  {brochures.map((b) => (
                    <a key={b.id} href={b.file_path} target="_blank" rel="noreferrer"
                       className="block text-sm text-[#1F7A6B] hover:underline">Brochure - {b.original_name}</a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT: price + agent */}
          <div className="space-y-6">
            {/* Price card */}
            <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
              <span className="inline-block rounded-full bg-[#15803D]/10 px-3 py-1 text-xs font-medium capitalize text-[#15803D]">
                {avail}
              </span>
              <div className="mt-3 text-3xl font-bold tracking-tight text-[#14201F]">{priceShort(p.price)}</div>
              <div className="mt-1 text-xs text-[#9AA6A4]">
                {p.project_name || p.name}{p.developer ? ` - ${p.developer}` : ""}
              </div>

              {isReviewer ? (
                <Link href={`/properties/${p.id}/edit`}
                  className="mt-4 block rounded-md bg-[#2563EB] py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#1e50c8]">
                  Edit Property
                </Link>
              ) : null}
            </div>

            {/* Owner (reviewers only) */}
            {isReviewer && (p.owner_name || p.owner_phone || p.owner_email) ? (
              <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
                <h2 className="text-xs font-medium uppercase tracking-wide text-[#9AA6A4]">Owner</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {p.owner_name ? <div className="font-medium text-[#14201F]">{p.owner_name}</div> : null}
                  {p.owner_phone ? <div className="text-[#6C7A78]">{p.owner_phone}</div> : null}
                  {p.owner_email ? <div className="text-[#6C7A78]">{p.owner_email}</div> : null}
                </div>
              </div>
            ) : null}

            {/* Listing agent */}
            {p.agent_name ? (
              <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
                <h2 className="text-xs font-medium uppercase tracking-wide text-[#9AA6A4]">Listing Agent</h2>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-xs font-semibold text-white">
                    {initials(p.agent_name)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#14201F]">{p.agent_name}</div>
                    <div className="text-xs text-[#6C7A78]">NBS Real Estate</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CrmShell>
  );
}