import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Kudos } from "@/models/Kudos";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const kudos = await Kudos.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .limit(50);

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
    const { toUserId, toUserName, message, companyValue } = body;

    if (!toUserId || !message || !companyValue) {
      return NextResponse.json({ error: "Recipient, message, and company value are required" }, { status: 400 });
    }

    await connectToDatabase();

    const kudos = await Kudos.create({
      fromUserId: userObjectId,
      fromUserName: session.userName,
      toUserId,
      toUserName,
      message,
      companyValue,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ kudos, message: "Kudos given!" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
