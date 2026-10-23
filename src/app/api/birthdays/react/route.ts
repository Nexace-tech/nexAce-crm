import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { BirthdayWish } from "@/models/BirthdayWish";
import { Notification } from "@/models/Notification";
import mongoose from "mongoose";

const ALLOWED_EMOJIS = ["❤️", "🍰", "🥳", "🙏", "🔥"];

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    const body = await request.json();
    const { wishId, emoji } = body;

    if (!wishId || !mongoose.Types.ObjectId.isValid(wishId)) {
      return NextResponse.json({ error: "A valid wishId is required" }, { status: 400 });
    }

    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Invalid emoji. Allowed emojis: ${ALLOWED_EMOJIS.join(" ")}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const wish = await BirthdayWish.findOne({
      _id: new mongoose.Types.ObjectId(wishId),
      tenantId: tenantObjectId,
    });

    if (!wish) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }

    // Toggle reaction: if the user already reacted with this emoji, remove it; else add it
    const existingIndex = wish.reactions.findIndex(
      (r) => r.userId.toString() === session.userId && r.emoji === emoji
    );

    let isAdded = false;
    if (existingIndex > -1) {
      // Remove reaction
      wish.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      wish.reactions.push({
        userId: userObjectId,
        userName: session.userName,
        emoji,
        createdAt: new Date(),
      });
      isAdded = true;
    }

    await wish.save();

    // If reaction was added, notify the original sender (if not reacting to own wish)
    if (isAdded && wish.senderId.toString() !== session.userId) {
      try {
        await Notification.create({
          recipientId: wish.senderId,
          title: `${emoji} ${session.userName} reacted to your wish!`,
          message: `${session.userName} sent a ${emoji} reaction to your celebration message.`,
          type: "kudos",
          linkUrl: "/dashboard",
          tenantId: tenantObjectId,
        });
      } catch (notifErr) {
        console.error("[POST /api/birthdays/react] Notification error:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      reactions: wish.reactions,
      isAdded,
    });
  } catch (error: any) {
    console.error("[POST /api/birthdays/react] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
