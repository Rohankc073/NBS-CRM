import { hashRefreshToken } from "@/server/auth/tokens";
import { query } from "@/server/db";
import { cookies } from "next/headers";

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get("refresh_token")?.value;

  // Kill the session server-side FIRST. Clearing cookies alone just
  // removes the browser's copy — the token itself would still be valid,
  // and anyone who captured it stays logged in.
  if (refreshToken) {
    await query(`DELETE FROM sessions WHERE refresh_token_hash = $1`, [
      hashRefreshToken(refreshToken),
    ]);
  }

  jar.delete("access_token");
  jar.delete("refresh_token");

  return Response.json({ ok: true });
}
