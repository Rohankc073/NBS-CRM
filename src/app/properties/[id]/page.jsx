import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { query, queryOne } from "@/server/db";
import CrmShell from "@/components/CrmShell";

const AED = (n) => (n == null ? "—" : "AED " + Number(n).toLocaleString("en-AE"));

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

  const Row = ({ label, value }) =>
    value ? (
      <div className="flex justify-between border-b border-[#F0EEE9] py-2 text-sm last:border-0">
        <span className="text-[#6C7A78]">{label}</span>
        <span className="text-[#14201F]">{value}</span>
      </div>
    ) : null;

  return (
    <CrmShell user={me}>
      <div className="p-8">
        <Link href="/properties" className="text-xs text-[#6C7A78] hover:text-[#14201F]">
          ← Properties
        </Link>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#14201F]">{p.name}</h1>
            <p className="mt-1 text-sm text-[#6C7A78]">
              {p.type_name || "—"}{p.community ? ` · ${p.community}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isReviewer ? (
              <Link
                href={`/properties/${p.id}/edit`}
                className="rounded-md bg-[#0F1C1E] px-3 py-2 text-sm font-medium text-[#FBFAF7] hover:bg-[#16292C]"
              >
                Edit
              </Link>
            ) : null}
            <div className="text-lg font-semibold text-[#1F7A6B]">{AED(p.price)}</div>
          </div>
        </div>

        {/* Image gallery */}
        {images.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <a key={img.id} href={img.file_path} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.file_path}
                  alt={p.name}
                  className="h-40 w-full rounded-lg border border-[#E4E1DA] object-cover"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-[#E4E1DA] p-8 text-center text-sm text-[#6C7A78]">
            No images uploaded.
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Details */}
          <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#14201F]">Details</h2>
            <Row label="Project" value={p.project_name} />
            <Row label="Developer" value={p.developer} />
            <Row label="Bedrooms" value={p.bedrooms} />
            <Row label="Bathrooms" value={p.bathrooms} />
            <Row label="Built-up area" value={p.built_up_area ? `${p.built_up_area} sqft` : null} />
            <Row label="Plot size" value={p.plot_size ? `${p.plot_size} sqft` : null} />
            <Row label="Availability" value={p.availability} />
            <Row label="Location" value={p.exact_location} />
            <Row label="Agent" value={p.agent_name} />
          </div>

          {/* Owner + docs */}
          <div className="space-y-6">
            {isReviewer ? (
              <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-[#14201F]">Owner</h2>
                <Row label="Name" value={p.owner_name} />
                <Row label="Phone" value={p.owner_phone} />
                <Row label="Email" value={p.owner_email} />
              </div>
            ) : null}

            {(floorPlans.length || brochures.length) ? (
              <div className="rounded-lg border border-[#E4E1DA] bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-[#14201F]">Documents</h2>
                <div className="space-y-2">
                  {floorPlans.map((f) => (
                    <a key={f.id} href={f.file_path} target="_blank" rel="noreferrer"
                       className="block text-sm text-[#1F7A6B] hover:underline">
                      Floor plan — {f.original_name}
                    </a>
                  ))}
                  {brochures.map((b) => (
                    <a key={b.id} href={b.file_path} target="_blank" rel="noreferrer"
                       className="block text-sm text-[#1F7A6B] hover:underline">
                      Brochure — {b.original_name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {p.description ? (
          <div className="mt-6 rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold text-[#14201F]">Description</h2>
            <p className="text-sm leading-relaxed text-[#14201F]">{p.description}</p>
          </div>
        ) : null}

        {amenities.length ? (
          <div className="mt-6 rounded-lg border border-[#E4E1DA] bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#14201F]">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a} className="rounded-full border border-[#E4E1DA] px-3 py-1 text-xs text-[#6C7A78]">
                  {a}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </CrmShell>
  );
}