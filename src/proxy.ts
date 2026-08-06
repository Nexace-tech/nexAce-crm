import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

/**
 * Next.js Proxy — runs before any page is rendered.
 * Protects all /dashboard/* routes by validating the session cookie.
 * Unauthenticated requests are redirected to /login immediately,
 * preventing any flash of authenticated UI.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await decrypt(sessionCookie);

    if (!session || !session.userId || !session.tenantId) {
      // Clear stale/invalid cookie and redirect
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  // Redirect authenticated users away from login/register pages
  if (pathname === "/login" || pathname === "/register") {
    const sessionCookie = request.cookies.get("session")?.value;
    if (sessionCookie) {
      const session = await decrypt(sessionCookie);
      if (session?.userId) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all dashboard routes and auth pages
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
