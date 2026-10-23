import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { BirthdayWish } from "@/models/BirthdayWish";
import { Notification } from "@/models/Notification";
import { sendEmail } from "@/lib/mail";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    const body = await request.json();
    const {
      recipientId,
      message,
      sticker = "cake",
      type = "birthday",
      attachments = [],
    } = body;

    if (!recipientId) {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "A non-empty message is required" }, { status: 400 });
    }

    if (recipientId === session.userId) {
      return NextResponse.json({ error: "You cannot send a celebration wish to yourself" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return NextResponse.json({ error: "Invalid recipient ID format" }, { status: 400 });
    }

    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
    await connectToDatabase();

    // 1. Verify recipient belongs to this tenant and is active
    const recipient = await User.findOne({
      _id: recipientObjectId,
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
    }).select("name email preferences department");

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found in your organization" }, { status: 404 });
    }

    // 2. Fetch sender profile for metadata
    const sender = await User.findById(userObjectId)
      .select("name photoUrl department")
      .lean();

    const senderName = sender?.name || session.userName || "A Colleague";
    const senderPhotoUrl = sender?.photoUrl || "";
    const senderDepartment = sender?.department || "";
    const currentYear = new Date().getFullYear();

    // 3. Save BirthdayWish
    let wish;
    try {
      wish = await BirthdayWish.create({
        recipientId: recipientObjectId,
        senderId: userObjectId,
        senderName,
        senderPhotoUrl,
        senderDepartment,
        message: message.trim().slice(0, 600),
        sticker,
        type: type === "anniversary" ? "anniversary" : "birthday",
        attachments: Array.isArray(attachments) ? attachments.slice(0, 4) : [],
        reactions: [],
        year: currentYear,
        acknowledged: false,
        tenantId: tenantObjectId,
      });
    } catch (dbErr: any) {
      if (dbErr.code === 11000) {
        return NextResponse.json(
          { error: `You have already sent your ${type} wish to ${recipient.name} for ${currentYear}.` },
          { status: 409 }
        );
      }
      throw dbErr;
    }

    // 4. Create in-app Notification
    const celebrationLabel = type === "anniversary" ? "Work Anniversary" : "Birthday";
    const stickerEmojiMap: Record<string, string> = {
      cake: "🎂",
      balloons: "🎈",
      cheers: "🥂",
      star: "🌟",
      gift: "🎁",
    };
    const emoji = stickerEmojiMap[sticker] || "🎉";

    try {
      await Notification.create({
        recipientId: recipientObjectId,
        title: `${emoji} ${celebrationLabel} Wish from ${senderName}!`,
        message: message.length > 90 ? `${message.slice(0, 87)}...` : message,
        type: "kudos",
        linkUrl: "/dashboard",
        tenantId: tenantObjectId,
      });
    } catch (notifErr) {
      console.error("[POST /api/birthdays/wish] In-app notification error:", notifErr);
    }

    // 5. Send Email Alert to Celebrant (asynchronous, non-blocking)
    if (recipient.email && recipient.preferences?.receiveBirthdayEmails !== false) {
      const emailSubject = `${emoji} ${senderName} sent you a ${celebrationLabel} wish!`;
      const photoSnippet = attachments.length > 0 ? `<p style="font-size: 13px; color: #64748b;">📷 Includes ${attachments.length} attachment(s)!</p>` : "";
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6366f1; margin-top: 0;">${emoji} New ${celebrationLabel} Wish!</h2>
          <p style="font-size: 15px; color: #334155;"><strong>${senderName}</strong> wrote to celebrate you today:</p>
          <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px 18px; margin: 16px 0; border-radius: 6px; font-style: italic; color: #1e293b;">
            "${message.trim()}"
          </div>
          ${photoSnippet}
          <div style="margin-top: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              View Wishes on Dashboard →
            </a>
          </div>
        </div>
      `;

      sendEmail({
        to: recipient.email,
        subject: emailSubject,
        text: `${senderName} sent you a ${celebrationLabel} wish: "${message}"`,
        html: emailHtml,
      }).catch((mailErr) => {
        console.warn("[POST /api/birthdays/wish] Optional email delivery notice:", mailErr?.message || mailErr);
      });
    }

    return NextResponse.json({
      success: true,
      wish,
    });
  } catch (error: any) {
    console.error("[POST /api/birthdays/wish] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET: Fetch celebration wishes for a specific recipient (or current user if omitted).
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("recipientId") || session.userId;
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return NextResponse.json({ error: "Invalid recipientId format" }, { status: 400 });
    }

    await connectToDatabase();

    const wishes = await BirthdayWish.find({
      tenantId: tenantObjectId,
      recipientId: new mongoose.Types.ObjectId(recipientId),
      year,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      wishes,
      count: wishes.length,
    });
  } catch (error: any) {
    console.error("[GET /api/birthdays/wish] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete or moderate a birthday wish.
 * Allowed for:
 * 1. The sender (retracting their own wish)
 * 2. The recipient / celebrant (removing unwanted wish from their wall)
 * 3. Elevated roles (Admin, HR, OPS moderation)
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const wishId = searchParams.get("id");

    if (!wishId || !mongoose.Types.ObjectId.isValid(wishId)) {
      return NextResponse.json({ error: "A valid wish ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const wish = await BirthdayWish.findOne({
      _id: new mongoose.Types.ObjectId(wishId),
      tenantId: tenantObjectId,
    });

    if (!wish) {
      return NextResponse.json({ error: "Wish not found" }, { status: 404 });
    }

    const isSender = wish.senderId.toString() === session.userId;
    const isRecipient = wish.recipientId.toString() === session.userId;
    const isElevated = ["Admin", "HR", "OPS"].includes(session.role);

    if (!isSender && !isRecipient && !isElevated) {
      return NextResponse.json(
        { error: "You are not authorized to delete this celebration wish." },
        { status: 403 }
      );
    }

    // Attempt to clean up attached files from disk if local
    if (Array.isArray(wish.attachments)) {
      const { unlink } = await import("fs/promises");
      const path = await import("path");
      for (const att of wish.attachments) {
        if (att.url && att.url.startsWith("/uploads/birthdays/")) {
          const filePath = path.join(process.cwd(), "public", att.url);
          unlink(filePath).catch(() => {});
        }
      }
    }

    await BirthdayWish.deleteOne({ _id: wish._id });

    return NextResponse.json({
      success: true,
      message: "Celebration wish deleted successfully.",
      deletedId: wishId,
    });
  } catch (error: any) {
    console.error("[DELETE /api/birthdays/wish] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
