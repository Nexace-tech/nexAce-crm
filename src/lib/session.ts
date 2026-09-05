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

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
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
