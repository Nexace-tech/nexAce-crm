import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve the active user's saved digital signature.
 * Falls back to tenant organization's authorized signature if user has not set one.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const userDoc = await User.findById(userObjectId).select("signatureUrl name role").lean();
    let signatureUrl = (userDoc as any)?.signatureUrl?.trim() || "";
    let source: "user" | "tenant" | "none" = signatureUrl ? "user" : "none";

    // Fall back to tenant company signature if user has no personal signature
    if (!signatureUrl) {
      const tenantDoc = await Tenant.findById(tenantObjectId).select("signatureUrl").lean();
      signatureUrl = (tenantDoc as any)?.signatureUrl?.trim() || "";
      if (signatureUrl) source = "tenant";
    }

    return NextResponse.json({
      signatureUrl,
      source,
      userName: (userDoc as any)?.name || "",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/users/signature error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST / PUT: Save active user's digital signature to their profile.
 * If saveToCompany is requested by Admin/OPS, also stamps on Tenant.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { signatureUrl, saveToCompany } = body;

    if (typeof signatureUrl !== "string") {
      return NextResponse.json({ error: "signatureUrl string is required" }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Update personal signature on User
    const updatedUser = await User.findByIdAndUpdate(
      userObjectId,
      { signatureUrl: signatureUrl.trim() },
      { new: true }
    ).select("signatureUrl name role").lean();

    // 2. Optionally update organization signature if privileged and requested
    const isPrivileged = session.role === "Admin" || session.role === "OPS";
    if (saveToCompany && isPrivileged) {
      await Tenant.findByIdAndUpdate(tenantObjectId, {
        signatureUrl: signatureUrl.trim(),
      });
    }

    return NextResponse.json({
      success: true,
      signatureUrl: (updatedUser as any)?.signatureUrl || signatureUrl,
      message: "Signature saved to profile successfully",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/users/signature error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
