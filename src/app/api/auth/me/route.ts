import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Tenant";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    
    let user = null;
    try {
      user = await User.findById(session.userId).select("-passwordHash").populate("tenantId");
    } catch {
      user = null;
    }

    if (!user) {
      await deleteSession();
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("API Auth Me error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

