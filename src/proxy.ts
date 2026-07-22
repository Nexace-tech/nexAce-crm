import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Specify protected and public routes
const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the current route is protected or auth-only
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.includes(path);

  // Retrieve the session cookie
  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  // Redirect rules
  
  // If trying to access a protected route without being logged in, redirect to login
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // If trying to access login/register while already logged in, redirect to dashboard
  if (isAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

// Routes proxy should run on
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
