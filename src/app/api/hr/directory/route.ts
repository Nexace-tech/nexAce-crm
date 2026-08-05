import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const role = searchParams.get("role");

    const query: any = { tenantId: tenantObjectId };
    if (department && department !== "All") {
      query.$or = [{ department }, { departments: department }];
    }
    if (role && role !== "All") {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error("GET /api/hr/directory error:", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
