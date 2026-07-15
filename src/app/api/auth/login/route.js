import { loginSchema } from "@/lib/validators/user";
import { rateLimit } from "@/server/auth/rate-limit";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "@/server/auth/tokens";
import { queryOne } from "@/server/db";
import argon2 from "argon2";
import { cookies, headers } from "next/headers";

const REFRESH_DAYS = 30;

export async function POST(request) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

  // Two windows. The IP limit stops one machine spraying many accounts;
  // the email limit stops many machines targeting one account. Checking
  // IP first means a flood can't even reach the more expensive checks.
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      },
    );
  }

  // Parse the body defensively — malformed JSON should be a clean 400,
  // not an unhandled 500.
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Validate shape. At login we deliberately DON'T enforce password
  // strength rules — that would leak them to an attacker. Just check
  // the fields are present and well-formed.
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }
  const { email, password } = parsed.data; // email already trimmed + lowercased

  // Per-account limit, checked after we know the email is well-formed.
  const emailLimit = rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
  if (!emailLimit.allowed) {
    return Response.json(
      { error: "Too many attempts for this account. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSec) },
      },
    );
  }

  const user = await queryOne(
    `SELECT id, name, email, role, password_hash, token_version, is_active
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );

  // One vague message for BOTH "no such email" and "wrong password".
  // Say "email not found" and you've handed an attacker a tool to
  // discover which of your agents have accounts.
  const invalid = () =>
    Response.json({ error: "Invalid email or password" }, { status: 401 });

  if (!user) return invalid();
  if (!user.is_active) {
    return Response.json({ error: "Account is disabled" }, { status: 403 });
  }

  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) return invalid();

  // Two tokens: a short-lived JWT proving identity, and a random string
  // that maps to a row in `sessions` — the row is what makes it revocable.
  const accessToken = await signAccessToken(user);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 864e5);

  await queryOne(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      user.id,
      hashRefreshToken(refreshToken), // the hash — never the token
      h.get("user-agent"),
      ip,
      expiresAt,
    ],
  );

  await queryOne(
    `UPDATE users SET last_seen_at = NOW() WHERE id = $1 RETURNING id`,
    [user.id],
  );

  // httpOnly = JavaScript cannot read these cookies. This is the line that
  // stops one XSS bug from exfiltrating every client phone number you hold.
  // Never put a token in localStorage.
  const jar = await cookies();
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  jar.set("access_token", accessToken, { ...base, maxAge: 60 * 15 });
  jar.set("refresh_token", refreshToken, {
    ...base,
    maxAge: REFRESH_DAYS * 86400,
  });

  return Response.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
