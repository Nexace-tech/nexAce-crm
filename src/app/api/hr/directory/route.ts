import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { getHRAccessScope } from "@/lib/hrIsolation";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const role = searchParams.get("role");

    const query: any = { tenantId: tenantObjectId };

    const scope = await getHRAccessScope(session, tenantObjectId, userObjectId);
    if (scope.allowedUserIds) {
      query._id = { $in: scope.allowedUserIds };
    }

    if (department && department !== "All") {
      query.$or = [{ department }, { departments: department }];
    }
    if (role && role !== "All") {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .populate("hrId", "name email role photoUrl")
      .populate("onboardedBy.hrId", "name email role")
      .populate("documentsConfirmedBy.hrId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      users,
      isolateHRData: scope.isIsolated,
      isPrivilegedAdmin: scope.isPrivilegedAdmin,
    });
  } catch (error: unknown) {
    console.error("GET /api/hr/directory error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
