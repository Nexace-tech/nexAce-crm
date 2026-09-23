import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { createSession } from "@/lib/session";
import { rateLimitLogin, getClientIp } from "@/lib/rateLimiter";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * JSON-based login endpoint for the native mobile app (Capacitor).
 * Returns JSON { success, error } instead of calling redirect(),
 * so the native login screen can handle the result client-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim()?.toLowerCase();
    const password = body.password as string;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password || password.length === 0) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    // Rate limiting
    const ip = await getClientIp();
    const limit = await rateLimitLogin(email, ip);
    if (!limit.allowed) {
      const waitSeconds = Math.ceil(limit.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${waitSeconds}s before trying again.` },
        { status: 429 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email }).populate("tenantId");

    const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const passwordMatch = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

    if (!user || !passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (user.status === "Suspended") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact your workspace administrator." },
        { status: 403 }
      );
    }

    if (user.status === "Pending") {
      return NextResponse.json(
        { error: "Your account is pending admin approval. Please wait for activation." },
        { status: 403 }
      );
    }

    const tenant = user.tenantId as any;
    if (!tenant) {
      return NextResponse.json({ error: "Company tenant not found for this account." }, { status: 500 });
    }

    await createSession(
      String(user._id),
      String(tenant._id),
      user.name,
      tenant.name,
      user.role
    );

    return NextResponse.json({ success: true, name: user.name, role: user.role });
  } catch (error: any) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { error: "An error occurred during login. Please check your connection and try again." },
      { status: 500 }
    );
  }
}
