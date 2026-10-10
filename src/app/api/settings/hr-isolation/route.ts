import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { isSubAdminRole } from "@/lib/roles";

/**
 * GET: Get current HR data isolation setting for the workspace
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const tenant = await Tenant.findById(tenantObjectId).select("isolateHRData").lean();
    return NextResponse.json({
      isolateHRData: Boolean(tenant?.isolateHRData),
    });
  } catch (error: unknown) {
    console.error("GET /api/settings/hr-isolation error:", error);
    return NextResponse.json({ error: "Failed to fetch HR isolation setting" }, { status: 500 });
  }
}

/**
 * PUT: Update HR data isolation toggle (Admin / OPS only)
 */
export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const { RolePermission } = await import("@/models/RolePermission");
    const { normalizeRoleKey } = await import("@/lib/roles");

    let hasManageHRPerm = false;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: normalizeRoleKey(session.role) }).lean();
      if (rolePerm?.featurePermissions?.manageHRIsolation) {
        hasManageHRPerm = true;
      }
    } catch {
      // fallback
    }

    const isAuthorized =
      session.role === "Admin" ||
      session.role === "OPS" ||
      isSubAdminRole(session.role) ||
      hasManageHRPerm;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to toggle Multi-HR Data Isolation" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const isolateHRData = Boolean(body.isolateHRData);

    await connectToDatabase();
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantObjectId,
      { $set: { isolateHRData } },
      { new: true, runValidators: false }
    ).select("isolateHRData").lean();

    return NextResponse.json({
      success: true,
      isolateHRData: Boolean(updatedTenant?.isolateHRData),
      message: isolateHRData
        ? "HR Data Isolation enabled. HR officers will only see their assigned employees."
        : "HR Data Isolation disabled. HR officers have workspace-wide view.",
    });
  } catch (error: unknown) {
    console.error("PUT /api/settings/hr-isolation error:", error);
    return NextResponse.json({ error: "Failed to update HR isolation setting" }, { status: 500 });
  }
}
