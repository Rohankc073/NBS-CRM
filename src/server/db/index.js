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
