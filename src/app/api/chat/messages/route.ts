import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ChatMessage } from "@/models/ChatMessage";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * GET: Fetch chat messages by channel.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") || "general";

    await connectToDatabase();

    const messages = await ChatMessage.find({
      tenantId: tenantObjectId,
      channel,
    })
      .sort({ createdAt: 1 })
      .limit(100);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("API GET ChatMessages error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Send a new message in a channel or DM.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { channel, content, isDM, recipientId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    await connectToDatabase();

    const newMessage = await ChatMessage.create({
      channel: channel || "general",
      senderId: userObjectId,
      senderName: session.userName || "Team Member",
      senderRole: session.role,
      content: content.trim(),
      isDM: Boolean(isDM),
      recipientId: recipientId || undefined,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("API POST ChatMessage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
