import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await deleteSession();
  } catch (err) {
    console.warn("Logout route deleteSession error:", err);
  }

  const url = new URL(request.url);
  const reason = url.searchParams.get("reason");

  const loginUrl = new URL("/login", request.url);
  if (reason) {
    loginUrl.searchParams.set("error", reason);
  }

  const response = NextResponse.redirect(loginUrl);

  // Guarantee cookie expiration in response headers
  response.cookies.delete("session");
  response.cookies.set("session", "", {
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
