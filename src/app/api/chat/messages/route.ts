import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ChatMessage } from "@/models/ChatMessage";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify } from "@/lib/notify";

/**
 * GET: Fetch chat messages by channel.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    await connectToDatabase();

    // Mode 1: Fetch recent conversation threads with unread counts
    if (mode === "conversations") {
      const conversations = await ChatMessage.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            $or: [
              { recipientId: userObjectId },
              { senderId: userObjectId },
              { channel: { $regex: /^dm_/ } }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$channel",
            lastMessage: { $first: "$content" },
            lastMessageAt: { $first: "$createdAt" },
            senderName: { $first: "$senderName" },
            senderId: { $first: "$senderId" },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$senderId", userObjectId] },
                      { $eq: ["$read", false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { lastMessageAt: -1 } }
      ]);
      return NextResponse.json({ conversations });
    }

    const channel = searchParams.get("channel") || "general";

    // Build query conditions (with precise target user isolation for DM channels)
    let queryCondition: any = { tenantId: tenantObjectId, channel };
    const possibleChannels = new Set<string>([channel]);

    if (channel.startsWith("dm_")) {
      const raw = channel.replace("dm_", "");
      const parts = raw.split("_");
      const isObjectId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);
      
      const objectIdStrs = parts.filter(isObjectId);
      let targetUser: any = null;

      if (objectIdStrs.length >= 2 && objectIdStrs[0] === objectIdStrs[1]) {
        targetUser = await User.findById(objectIdStrs[0]).lean();
      } else {
        const otherIdStr = objectIdStrs.find((id) => id !== userObjectId.toString());
        if (otherIdStr) {
          targetUser = await User.findById(otherIdStr).lean();
        } else if (parts.length > 0) {
          targetUser = await User.findOne({
            tenantId: tenantObjectId,
            $or: [
              { name: { $regex: new RegExp(parts.filter(Boolean).join("|"), "i") } }
            ]
          }).lean();
        }
      }

      const myIdStr = userObjectId.toString();
      const myNameKey = session.userName ? session.userName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "";

      if (targetUser) {
        const targetIdStr = targetUser._id.toString();
        const targetNameKey = targetUser.name ? targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_") : "";

        // Pairwise channels specifically for this 2-user conversation
        const pairIdKey = [myIdStr, targetIdStr].sort().join("_");
        possibleChannels.add(`dm_${pairIdKey}`);
        possibleChannels.add(`dm_${targetIdStr}`);
        if (targetNameKey) possibleChannels.add(`dm_${targetNameKey}`);
        if (myNameKey && targetNameKey) {
          possibleChannels.add(`dm_${myNameKey}_${targetNameKey}`);
          possibleChannels.add(`dm_${targetNameKey}_${myNameKey}`);
        }

        const targetObjId = new mongoose.Types.ObjectId(targetIdStr);
        queryCondition = {
          tenantId: tenantObjectId,
          $or: [
            { channel: { $in: Array.from(possibleChannels) } },
            { senderId: userObjectId, recipientId: targetObjId },
            { senderId: targetObjId, recipientId: userObjectId }
          ]
        };
      } else {
        queryCondition = {
          tenantId: tenantObjectId,
          channel: { $in: Array.from(possibleChannels) }
        };
      }
    }

    // Automatically mark unread messages in this channel sent by others as read by current user
    const userIdentifier = session?.userName || userObjectId.toString();
    const markReadFilter = channel.startsWith("dm_")
      ? queryCondition
      : {
          tenantId: tenantObjectId,
          channel: { $in: Array.from(possibleChannels) },
          senderId: { $ne: userObjectId },
          read: false,
        };

    await ChatMessage.updateMany(
      {
        ...markReadFilter,
        senderId: { $ne: userObjectId },
        read: false,
      },
      {
        $set: { read: true, readAt: new Date() },
        $addToSet: { readBy: userIdentifier },
      }
    );

    const messages = await ChatMessage.find(queryCondition)
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

    // ── Notification logic ──────────────────────────────────────────────────
    const channelStr = channel || "general";
    const safeContent = trimmedContent || (attachments?.[0] ? `[Attachment] ${attachments[0].name}` : "Sent an attachment");
    const snippet = safeContent.length > 80 ? `${safeContent.slice(0, 80)}...` : safeContent;

    // Case 1: Direct Message channel (channel name starts with "dm_")
    //   Format: "dm_<recipientUserId>" or "dm_<idA>_<idB>"
    const isDMChannel = channelStr.startsWith("dm_");
    if (isDMChannel) {
      let targetRecipientId = recipientId;
      if (!targetRecipientId) {
        const raw = channelStr.replace("dm_", "");
        const parts = raw.split("_");
        const foundUser = await User.findOne({
          tenantId: tenantObjectId,
          _id: { $ne: userObjectId },
          $or: [
            { name: { $regex: new RegExp(parts.filter(Boolean).join("|"), "i") } },
          ]
        }).select("_id").lean();
        if (foundUser) {
          targetRecipientId = foundUser._id.toString();
        }
      }

      if (targetRecipientId && targetRecipientId !== userObjectId.toString()) {
        await notify(tenantObjectId, targetRecipientId, {
          title: `💬 ${session.userName}`,
          message: snippet,
          type: "chat",
          linkUrl: `/dashboard/chat?channel=${encodeURIComponent(channelStr)}`,
        });
      }
    } else if (Array.isArray(mentions) && mentions.length > 0 && !mentions.includes("everyone")) {
      // Case 2: @mention of specific users in a public channel
      // mentions[] contains user NAMES — look up their IDs
      const mentionedUsers = await User.find({
        tenantId: tenantObjectId,
        name: { $in: mentions },
        _id: { $ne: userObjectId },
      }).select("_id").lean();

      if (mentionedUsers.length > 0) {
        const ids = mentionedUsers.map((u: any) => u._id.toString());
        await notify(tenantObjectId, ids, {
          title: `📣 You were mentioned in #${channelStr}`,
          message: `${session.userName}: ${snippet}`,
          type: "chat",
          linkUrl: `/dashboard/chat?channel=${encodeURIComponent(channelStr)}`,
        });
      }
    } else if (mentions.includes("everyone")) {
      // Case 3: @everyone — notify the whole tenant
      await notify(tenantObjectId, "broadcast", {
        title: `📣 @everyone in #${channelStr}`,
        message: `${session.userName}: ${snippet}`,
        type: "chat",
        linkUrl: `/dashboard/chat?channel=${encodeURIComponent(channelStr)}`,
      });
    } else {
      // Case 4: Regular channel message — notify all other tenant members
      const otherMembers = await User.find({
        tenantId: tenantObjectId,
        _id: { $ne: userObjectId },
      }).select("_id").lean();

      if (otherMembers.length > 0) {
        const ids = otherMembers.map((u: any) => u._id.toString());
        await notify(tenantObjectId, ids, {
          title: `#${channelStr}`,
          message: `${session.userName}: ${snippet}`,
          type: "chat",
          linkUrl: "/dashboard/chat",
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

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
