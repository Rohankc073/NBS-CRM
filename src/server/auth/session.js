import { queryOne } from "@/server/db";
import { cookies } from "next/headers";
import { verifyAccessToken } from "./tokens";

/**
 * Who is making this request? Returns the user, or null.
 *
 * Note it re-reads the user from the database rather than trusting the
 * role inside the token. The token says what was true 15 minutes ago;
 * the database says what is true now. If a Super Admin demoted someone
 * mid-session, the token still claims 'admin' — and we'd honour it.
 * token_version is the backstop: bump it and every old token is void.
 */
export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const user = await queryOne(
    `SELECT id, name, email, role, is_active, token_version
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [payload.sub],
  );

  if (!user || !user.is_active) return null;

  // Token was issued before a role change or password reset. Dead.
  if (user.token_version !== payload.tv) return null;

  return user;
}
