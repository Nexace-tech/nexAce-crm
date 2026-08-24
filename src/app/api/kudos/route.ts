import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Kudos } from "@/models/Kudos";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify } from "@/lib/notify";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const kudos = await Kudos.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ kudos });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { toUserId, message, companyValue } = body;

    if (!toUserId || !message || !companyValue) {
      return NextResponse.json({ error: "Recipient, message, and company value are required" }, { status: 400 });
    }

    await connectToDatabase();

    const { User } = await import("@/models/User");
    const recipient = await User.findOne({ _id: toUserId, tenantId: tenantObjectId }).lean();
    if (!recipient) {
      return NextResponse.json({ error: "Recipient user not found in this workspace" }, { status: 404 });
    }

    const kudos = await Kudos.create({
      fromUserId: userObjectId,
      fromUserName: session.userName,
      toUserId: recipient._id,
      toUserName: recipient.name,
      message: message.trim(),
      companyValue,
      tenantId: tenantObjectId,
    });

    // Notify the recipient
    await notify(tenantObjectId, toUserId, {
      title: "🎉 You Received Kudos!",
      message: `${session.userName} gave you kudos: "${message.length > 80 ? message.substring(0, 80) + "..." : message}"`,
      type: "kudos",
      linkUrl: "/dashboard/goals",
    });

    return NextResponse.json({ kudos, message: "Kudos given!" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
