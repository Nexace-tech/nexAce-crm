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
    const { channel, content, isDM, recipientId, parentId, mentions } = body;

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
      parentId: parentId || undefined,
      mentions: mentions || [],
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("API POST ChatMessage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Toggle reaction emoji on a chat message.
 * Body: { messageId: string, emoji: string }
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId } = authResult;
    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
    }

    await connectToDatabase();

    const userName = session.userName || "Team Member";

    const message = await ChatMessage.findOne({
      _id: messageId,
      tenantId: tenantObjectId,
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Initialize reactions array if missing
    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if user already reacted with THIS exact emoji (for toggle-off)
    let hadSameEmoji = false;

    // Remove user from ALL existing reactions (enforces 1 reaction per user)
    for (let i = message.reactions.length - 1; i >= 0; i--) {
      const r = message.reactions[i];
      const userIdx = r.users.indexOf(userName);
      if (userIdx > -1) {
        if (r.emoji === emoji) hadSameEmoji = true;
        r.users.splice(userIdx, 1);
        if (r.users.length === 0) {
          message.reactions.splice(i, 1);
        }
      }
    }

    // If user clicked a DIFFERENT emoji → add it. If same emoji → they're toggling off, skip.
    if (!hadSameEmoji) {
      const targetIdx = message.reactions.findIndex((r: any) => r.emoji === emoji);
      if (targetIdx > -1) {
        message.reactions[targetIdx].users.push(userName);
      } else {
        message.reactions.push({ emoji, users: [userName] });
      }
    }

    message.markModified("reactions");
    await message.save();

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("API PUT ChatMessage reaction error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
