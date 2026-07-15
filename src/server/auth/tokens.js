import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// 15 minutes. Deliberately short: this token is NOT checked against the
// database on every request, so it's the window an attacker (or a fired
// agent) has before it dies. Short window = small blast radius.
const ACCESS_TTL = "15m";

export async function signAccessToken(user) {
  return new SignJWT({
    role: user.role,
    // Stamped into the token. If we bump token_version on the user (on
    // role change or password reset), every token they hold stops matching
    // and dies instantly — no waiting 15 minutes.
    tv: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { sub, role, tv, exp }
  } catch {
    return null; // expired, tampered with, or garbage
  }
}

// The refresh token is NOT a JWT — it's just a long random string. It
// carries no data; it's a key that looks up a row in the sessions table.
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

// We store only this hash in the database, never the token itself.
// SHA-256 (not argon2) is right here: the input is already 48 bytes of
// pure randomness, so there's nothing to brute-force, and this runs on
// every refresh — it needs to be fast.
export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
