import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Everything is protected by default. Only these are open.
// A deny-by-default list is the point: forget to protect a new route
// and it stays locked, rather than silently going public.
const PUBLIC = ["/login", "/setup", "/forgot-password"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next(); // valid — carry on
    } catch {
      // Expired or tampered with. Fall through to the redirect below.
    }
  }

  // No valid token. Send them to login, remembering where they were
  // headed so we can return them there afterwards.
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals, static files, and the auth API itself —
  // /api/auth/login must stay reachable to someone with no token.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
