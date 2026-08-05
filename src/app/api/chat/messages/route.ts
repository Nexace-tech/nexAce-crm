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

    const { session, tenantObjectId, userObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") || "general";

    await connectToDatabase();

    // Automatically mark unread messages in this channel sent by others as read by current user
    const userIdentifier = session?.userName || userObjectId.toString();
    await ChatMessage.updateMany(
      {
        tenantId: tenantObjectId,
        channel,
        senderId: { $ne: userObjectId },
        read: false,
      },
      {
        $set: { read: true, readAt: new Date() },
        $addToSet: { readBy: userIdentifier },
      }
    );

    const messages = await ChatMessage.find({
      tenantId: tenantObjectId,
      channel,
    })
      .sort({ createdAt: 1 })
      .limit(100);

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET ChatMessages error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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
    const { channel, content, isDM, recipientId, parentId, mentions, attachments } = body;

    const trimmedContent = (content || "").trim();
    if (!trimmedContent && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Message must contain text or an attachment" }, { status: 400 });
    }

    await connectToDatabase();

    const newMessage = await ChatMessage.create({
      channel: channel || "general",
      senderId: userObjectId,
      senderName: session.userName || "Team Member",
      senderRole: session.role,
      content: trimmedContent || (attachments && attachments[0] ? `[Attachment] ${attachments[0].name}` : "Attachment"),
      isDM: Boolean(isDM),
      recipientId: recipientId || undefined,
      parentId: parentId || undefined,
      mentions: mentions || [],
      attachments: attachments || [],
      tenantId: tenantObjectId,
    });

    // Real-time Notification triggers for DM and Mentions
    const { Notification } = await import("@/models/Notification");

    if (isDM && recipientId) {
      const safeContent = content || "";
      const textSnippet = safeContent ? `"${safeContent.slice(0, 60)}${safeContent.length > 60 ? "..." : ""}"` : "Sent an attachment";
      await Notification.create({
        tenantId: tenantObjectId,
        recipientId,
        title: "New Direct Message",
        message: `${session.userName}: ${textSnippet}`,
        type: "chat",
        linkUrl: "/dashboard/chat",
        read: false,
      });
    } else if (Array.isArray(mentions) && mentions.length > 0) {
      const mentionDocs = mentions.map((mId: string) => ({
        tenantId: tenantObjectId,
        recipientId: mId,
        title: "You were mentioned in Chat",
        message: `${session.userName} mentioned you in #${channel || "general"}`,
        type: "chat",
        linkUrl: "/dashboard/chat",
        read: false,
      }));
      await Notification.insertMany(mentionDocs);
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST ChatMessage error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT ChatMessage reaction error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Delete message for me or delete for everyone.
 * Body: { messageId: string, deleteMode: "me" | "everyone" }
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { messageId, deleteMode } = body;

    if (!messageId || !deleteMode) {
      return NextResponse.json({ error: "messageId and deleteMode ('me' | 'everyone') are required" }, { status: 400 });
    }

    await connectToDatabase();

    const message = await ChatMessage.findOne({
      _id: messageId,
      tenantId: tenantObjectId,
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const userName = session.userName || "Team Member";
    const userIdStr = userObjectId.toString();

    if (deleteMode === "everyone") {
      const isSender = message.senderId?.toString() === userIdStr || message.senderName === userName;
      const isAdminOrManager = session.role === "Admin" || session.role === "Manager";

      if (!isSender && !isAdminOrManager) {
        return NextResponse.json({ error: "Only the message sender or an admin can delete a message for everyone" }, { status: 403 });
      }

      message.deletedForEveryone = true;
      message.content = "This message was deleted";
      await message.save();
    } else {
      // Delete for me
      if (!message.deletedForUsers) {
        message.deletedForUsers = [];
      }
      if (!message.deletedForUsers.includes(userName)) {
        message.deletedForUsers.push(userName);
      }
      if (!message.deletedForUsers.includes(userIdStr)) {
        message.deletedForUsers.push(userIdStr);
      }
      message.markModified("deletedForUsers");
      await message.save();
    }

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE ChatMessage error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
