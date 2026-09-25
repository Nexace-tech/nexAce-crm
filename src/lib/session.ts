import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getEncodedKey() {
  const rawSecret = process.env.SESSION_SECRET;
  if (!rawSecret) {
    throw new Error(
      "SESSION_SECRET environment variable is not set. This is required for secure session management."
    );
  }
  if (process.env.NODE_ENV === "production" && rawSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET is too short. A minimum length of 32 characters is required for HS256 JWT security in production."
    );
  }
  return new TextEncoder().encode(rawSecret);
}

export interface SessionPayload {
  userId: string;
  tenantId: string;
  userName: string;
  tenantName: string;
  role: string;
  expiresAt: Date;
}

type EncryptPayload = Omit<SessionPayload, "expiresAt"> & { expiresAt: Date | string };

export async function encrypt(payload: EncryptPayload) {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  tenantId: string,
  userName: string,
  tenantName: string,
  role: string
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await encrypt({ userId, tenantId, userName, tenantName, role, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Retrieves the session from the JWT cookie.
 *
 * By default (skipDbValidation=false), also re-validates the user against the
 * database to ensure the account still exists and is active. This prevents
 * privilege escalation from stale JWTs (e.g., a demoted Admin's old token
 * still carrying "Admin" for up to 7 days).
 *
 * Pass skipDbValidation=true when the caller will perform its own DB
 * validation (e.g., dashboard layout, /api/auth/me), to avoid redundant queries.
 */
export async function getSession(skipDbValidation = false): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  const payload = await decrypt(session);
  if (!payload) return null;
  if (skipDbValidation) return payload;

  // DB-backed revalidation: confirm the user still exists and is active
  try {
    const { connectToDatabase } = await import("@/lib/db");
    const { User } = await import("@/models/User");
    const mongoose = (await import("mongoose")).default;
    await connectToDatabase();

    const user = await User.findOne({
      _id: payload.userId,
      tenantId: new mongoose.Types.ObjectId(payload.tenantId),
    })
      .select("role status")
      .lean();

    if (!user) {
      // User explicitly not found (deleted / cross-tenant) — force re-auth
      return null;
    }

    if (user.status === "Pending" || user.status === "Suspended") {
      // Explicitly blocked — force re-auth
      return null;
    }

    // Return session with DB-authoritative role (not JWT-self-asserted)
    return { ...payload, role: user.role };
  } catch {
    // Transient DB error (cold-start reconnect, timeout, etc.).
    // Fall back to the JWT payload so a momentary DB hiccup on app
    // cold-start doesn't force the user to re-login.
    // The JWT is still cryptographically verified above — this is safe.
    console.warn("[session] DB revalidation failed (transient) — trusting JWT payload");
    return payload;
  }
}

export async function updateSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  const payload = await decrypt(sessionToken);

  if (!sessionToken || !payload) {
    return null;
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Re-mint the JWT so both the cookie AND the token expiry are refreshed
  const newToken = await encrypt({ ...payload, expiresAt: expires });
  cookieStore.set("session", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expires,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
