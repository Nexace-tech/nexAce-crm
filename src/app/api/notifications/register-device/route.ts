import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, platform } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Valid device push token is required" }, { status: 400 });
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.userId, {
      $addToSet: { deviceTokens: token.trim() },
      $set: { lastActiveAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Device registered for push notifications successfully",
      platform: platform || "native",
    });
  } catch (error: any) {
    console.error("Error registering device push token:", error);
    return NextResponse.json(
      { error: "Failed to register device token", details: error.message },
      { status: 500 }
    );
  }
}
