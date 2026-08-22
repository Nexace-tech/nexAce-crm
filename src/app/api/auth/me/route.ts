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
      user = await User.findByIdAndUpdate(
        session.userId,
        { $set: { lastActiveAt: new Date() } },
        { returnDocument: "after" }
      )
        .select("-passwordHash")
        .populate("tenantId")
        .lean();
    } catch (err) {
      console.error("Error finding user in /api/auth/me:", err);
      user = null;
    }

    // Security: do NOT fabricate a user from unverified JWT claims. If the user
    // cannot be found in the DB (deleted, cross-tenant, or transient error),
    // force re-authentication rather than trusting the token's self-asserted
    // role/status.
    if (!user) {
      const { deleteSession } = await import("@/lib/session");
      await deleteSession();
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("API Auth Me error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


