import { getCurrentUser } from "@/server/auth/session";
import { queryOne, transaction } from "@/server/db";
import { pickNextAgent } from "@/server/leads/assign";

// POST -> create a lead from this cold contact, mark the contact converted.
export async function POST(request, { params }) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;

  const contact = await queryOne(
    `SELECT * FROM cold_contacts WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });

  const isManager = me.role === "super_admin" || me.role === "admin";
  if (!isManager && contact.assigned_to !== me.id) {
    return Response.json({ error: "Not assigned to you" }, { status: 403 });
  }
  if (contact.converted_lead_id) {
    return Response.json({ error: "Already converted" }, { status: 409 });
  }

  // Default lead status (New).
  const status = await queryOne(
    `SELECT id FROM lead_statuses WHERE is_default = TRUE LIMIT 1`,
  );
  if (!status)
    return Response.json(
      { error: "No default lead status configured" },
      { status: 500 },
    );

  const result = await transaction(async (client) => {
    // Assign the new lead to the contact's agent, or round-robin if none.
    const agentId = contact.assigned_to || (await pickNextAgent(client));

    // Build a notes string from the property details so nothing is lost.
    const bits = [];
    if (contact.building) bits.push(`Building: ${contact.building}`);
    if (contact.unit_number) bits.push(`Unit: ${contact.unit_number}`);
    if (contact.no_of_beds) bits.push(`Beds: ${contact.no_of_beds}`);
    if (contact.sqft) bits.push(`SQFT: ${contact.sqft}`);
    if (contact.remark) bits.push(`Remark: ${contact.remark}`);
    const notes = ["Converted from cold call.", ...bits].join(" | ");

    const lead = await client.query(
      `INSERT INTO leads (
         name, phone, phone_normalized, alt_phone, email,
         preferred_type, notes, status_id, assigned_to, campaign, created_by
       ) VALUES (
         $1,$2,$3,$4,$5, $6,$7,$8,$9,$10,$11
       )
       RETURNING id, ref_no`,
      [
        contact.name,
        contact.phone,
        contact.phone_normalized,
        contact.mobile,
        contact.email,
        contact.no_of_beds ? `${contact.no_of_beds} BR` : null,
        notes,
        status.id,
        agentId,
        "Cold Call",
        me.id,
      ],
    );
    const leadId = lead.rows[0].id;

    // Mark the contact converted + linked.
    await client.query(
      `UPDATE cold_contacts
         SET status = 'Converted', converted_lead_id = $1, converted_at = NOW()
       WHERE id = $2`,
      [leadId, id],
    );

    return lead.rows[0];
  });

  return Response.json({ ok: true, lead: result });
}
