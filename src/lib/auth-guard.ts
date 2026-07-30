import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/session";
import mongoose from "mongoose";

export interface AuthenticatedContext {
  session: SessionPayload;
  tenantObjectId: mongoose.Types.ObjectId;
  userObjectId: mongoose.Types.ObjectId;
}

/**
 * Validates active session, tenant isolation, and optional Role-Based Access Control (RBAC).
 * Returns either the authenticated context or an immediate NextResponse error.
 */
export async function requireTenantSession(
  allowedRoles?: Array<"Admin" | "Manager" | "HR" | "Employee">
): Promise<AuthenticatedContext | NextResponse> {
  const session = await getSession();

  if (!session || !session.userId || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(session.role as any);
    if (!hasRole) {
      return NextResponse.json(
        { error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles` },
        { status: 403 }
      );
    }
  }

  return {
    session,
    tenantObjectId: new mongoose.Types.ObjectId(session.tenantId),
    userObjectId: new mongoose.Types.ObjectId(session.userId),
  };
}

export function isAuthError(
  result: AuthenticatedContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
