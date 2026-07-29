import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    
    let user = null;
    try {
      user = await User.findById(session.userId)
        .select("-passwordHash")
        .populate("tenantId")
        .lean();
    } catch (err) {
      console.error("Error finding user in /api/auth/me:", err);
      user = null;
    }

    if (!user && session) {
      user = {
        _id: session.userId,
        name: session.userName,
        role: session.role,
        tenantId: {
          _id: session.tenantId,
          name: session.tenantName,
          slug: session.tenantName?.toLowerCase().replace(/\s+/g, "-") || "workspace"
        },
        status: "Active"
      };
    }

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("API Auth Me error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


