// Round-robin: hand each new lead to the next active agent in rotation.
//
// "Agents" = sales_agent and telecaller roles (the people who work leads).
// We remember the last agent assigned in the single-row assignment_state
// table, find their position in the ordered agent list, and pick the next
// one (wrapping around at the end).
//
// Runs INSIDE the caller's transaction (client passed in), so a lead and
// its assignment either both commit or both roll back.
export async function pickNextAgent(client) {
  // Active agents who can receive leads, in a stable order.
  const agents = await client.query(
    `SELECT id FROM users
     WHERE role IN ('sales_agent', 'telecaller')
       AND is_active = TRUE
       AND deleted_at IS NULL
     ORDER BY created_at, id`,
  );

  if (agents.rows.length === 0) return null; // no one to assign to

  const ids = agents.rows.map((r) => r.id);

  // Who got the last lead?
  const state = await client.query(
    `SELECT last_agent_id FROM assignment_state WHERE id = 1`,
  );
  const lastId = state.rows[0]?.last_agent_id;

  // Find the next agent after the last one; wrap to the start.
  let nextIndex = 0;
  if (lastId) {
    const lastIndex = ids.indexOf(lastId);
    // If the last agent still exists, go to the next; else start from 0.
    nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % ids.length;
  }

  const nextId = ids[nextIndex];

  // Remember this pick for next time.
  await client.query(
    `UPDATE assignment_state SET last_agent_id = $1 WHERE id = 1`,
    [nextId],
  );

  return nextId;
}
