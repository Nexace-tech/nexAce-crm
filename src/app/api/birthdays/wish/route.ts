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
 * GET: Fetch celebration wishes with flexible scope:
 * - scope="received" (default): Wishes received by recipientId (or session user)
 * - scope="sent": Wishes sent by session user to teammates
 * - scope="company": All celebratory wishes across the organization
 * - year: "all" or specific number (defaults to "all" to preserve complete celebration history)
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "received";
    const recipientId = searchParams.get("recipientId");
    const yearParam = searchParams.get("year");

    await connectToDatabase();

    const query: any = { tenantId: tenantObjectId };

    if (yearParam && yearParam !== "all") {
      const parsedYear = parseInt(yearParam, 10);
      if (!isNaN(parsedYear)) {
        query.year = parsedYear;
      }
    }

    if (scope === "sent") {
      query.senderId = userObjectId;
    } else if (scope === "company") {
      // Company-wide celebration feed across tenant
    } else {
      // Received wishes
      const targetRecipientId = recipientId || session.userId;
      if (!mongoose.Types.ObjectId.isValid(targetRecipientId)) {
        return NextResponse.json({ error: "Invalid recipientId format" }, { status: 400 });
      }
      query.recipientId = new mongoose.Types.ObjectId(targetRecipientId);
    }

    const rawWishes = await BirthdayWish.find(query)
      .populate("recipientId", "name photoUrl department")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const formattedWishes = rawWishes.map((w: any) => ({
      _id: w._id.toString(),
      recipientId: w.recipientId?._id?.toString() || w.recipientId?.toString(),
      recipientName: w.recipientId?.name || "Colleague",
      recipientPhotoUrl: w.recipientId?.photoUrl || "",
      recipientDepartment: w.recipientId?.department || "",
      senderId: w.senderId.toString(),
      senderName: w.senderName,
      senderPhotoUrl: w.senderPhotoUrl || "",
      senderDepartment: w.senderDepartment || "",
      message: w.message,
      sticker: w.sticker,
      type: w.type,
      attachments: w.attachments || [],
      reactions: w.reactions || [],
      year: w.year,
      acknowledged: w.acknowledged,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({
      success: true,
      wishes: formattedWishes,
      count: formattedWishes.length,
      scope,
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

    const normRole = (session.role || "").trim().toLowerCase();
    const isElevated = ["admin", "hr", "ops", "sub admin", "subadmin", "manager"].includes(normRole);

    let targetIds: string[] = [];
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("id");
    const queryIds = searchParams.get("ids");

    if (queryIds) {
      targetIds = queryIds.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (queryId) {
      targetIds = [queryId.trim()];
    } else {
      // Check if IDs provided in JSON body
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          targetIds = body.ids.map((s: any) => String(s).trim()).filter(Boolean);
        } else if (body?.id) {
          targetIds = [String(body.id).trim()];
        }
      } catch {
        // Body is optional if query params are present
      }
    }

    // Filter valid mongo IDs
    const validIds = targetIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "One or more valid wish IDs are required." }, { status: 400 });
    }

    await connectToDatabase();

    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const targetWishes = await BirthdayWish.find({
      _id: { $in: objectIds },
      tenantId: tenantObjectId,
    });

    if (!targetWishes || targetWishes.length === 0) {
      return NextResponse.json({ error: "No matching celebration wishes found to delete." }, { status: 404 });
    }

    // Authorization verification
    const allowedWishes = targetWishes.filter((wish) => {
      const isSender = wish.senderId.toString() === session.userId;
      const isRecipient = wish.recipientId.toString() === session.userId;
      return isSender || isRecipient || isElevated;
    });

    if (allowedWishes.length === 0) {
      return NextResponse.json(
        { error: "You are not authorized to delete the requested celebration wish(es)." },
        { status: 403 }
      );
    }

    // Clean up local disk attachments if present
    const { unlink } = await import("fs/promises");
    const path = await import("path");
    for (const wish of allowedWishes) {
      if (Array.isArray(wish.attachments)) {
        for (const att of wish.attachments) {
          if (att.url && att.url.startsWith("/uploads/birthdays/")) {
            const filePath = path.join(process.cwd(), "public", att.url);
            unlink(filePath).catch(() => {});
          }
        }
      }
    }

    const allowedIds = allowedWishes.map((w) => w._id);
    await BirthdayWish.deleteMany({ _id: { $in: allowedIds } });

    const deletedStringIds = allowedIds.map((id) => id.toString());

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedStringIds.length} celebration wish${deletedStringIds.length > 1 ? "es" : ""}.`,
      deletedIds: deletedStringIds,
      deletedCount: deletedStringIds.length,
    });
  } catch (error: any) {
    console.error("[DELETE /api/birthdays/wish] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
