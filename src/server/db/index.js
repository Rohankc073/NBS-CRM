import { Pool } from "pg";

const globalForDb = globalThis;

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

// Run several statements as ONE unit — all succeed, or none do.
// Bulk import uses this: if row 40 fails, the first 39 roll back
// automatically, so you never get a half-finished import.
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release(); // return the connection to the pool
  }
}