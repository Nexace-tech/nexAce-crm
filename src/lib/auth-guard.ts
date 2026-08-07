import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import mongoose from "mongoose";

export interface AuthenticatedContext {
  session: SessionPayload;
  tenantObjectId: mongoose.Types.ObjectId;
  userObjectId: mongoose.Types.ObjectId;
}

/**
 * Validates active session, tenant isolation, and optional Role-Based Access Control (RBAC).
 *
 * Security: the JWT is verified cryptographically, but the role/status/tenant are also
 * re-validated against the database here so a stale or forged token cannot grant
 * elevated privileges. The returned `session.role` is the DB-authoritative value.
 *
 * Returns either the authenticated context or an immediate NextResponse error.
 */
export async function requireTenantSession(
  allowedRoles?: Array<"Admin" | "OPS" | "Manager" | "HR" | "Employee">
): Promise<AuthenticatedContext | NextResponse> {
  const session = await getSession();

  if (!session || !session.userId || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  await connectToDatabase();

  const user = await User.findOne({
    _id: session.userId,
    tenantId: new mongoose.Types.ObjectId(session.tenantId),
  }).lean();

  if (!user || user.status === "Pending" || user.status === "Suspended") {
    return NextResponse.json({ error: "Unauthorized access: Account not active" }, { status: 401 });
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = (allowedRoles as string[]).includes(user.role);
    if (!hasRole) {
      return NextResponse.json(
        { error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles` },
        { status: 403 }
      );
    }
  }

  // Return a session whose role is authoritative (sourced from the DB).
  const verifiedSession: SessionPayload = {
    ...session,
    role: user.role,
  };

  return {
    session: verifiedSession,
    tenantObjectId: new mongoose.Types.ObjectId(session.tenantId),
    userObjectId: new mongoose.Types.ObjectId(session.userId),
  };
}

export function isAuthError(
  result: AuthenticatedContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
