import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { ChatMessage } from "@/models/ChatMessage";
import { Channel } from "@/models/Channel";
import { Notification } from "@/models/Notification";
import { sendEmail } from "@/lib/mail";
import { evaluateCelebrations } from "@/lib/birthdays/date-utils";

/**
 * POST /api/birthdays/broadcast
 * 1. Checks today's celebrants (birthdays & anniversaries)
 * 2. Idempotently broadcasts announcement card in #general chat
 * 3. Sends morning celebratory E-Card to celebrants via email
 * 4. Checks 3-day advance notice for HR and Managers
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const activeUsers = await User.find({
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
    })
      .select("_id name email role department photoUrl phone dob joinDate preferences hrId managerId")
      .lean();

    const normalizedUsers = activeUsers.map((u: any) => ({
      _id: u._id.toString(),
      name: u.name,
      photoUrl: u.photoUrl,
      department: u.department,
      role: u.role,
      phone: u.phone,
      dob: u.dob,
      joinDate: u.joinDate,
      preferences: u.preferences,
      hrId: u.hrId,
      managerId: u.managerId,
      email: u.email,
    }));

    const birthdayResults = evaluateCelebrations(normalizedUsers, "birthday", 14, now);
    const anniversaryResults = evaluateCelebrations(normalizedUsers, "anniversary", 14, now);

    // ─────────────────────────────────────────────────────────────
    // 1. Ensure #general channel exists
    // ─────────────────────────────────────────────────────────────
    let generalChannel = await Channel.findOne({
      tenantId: tenantObjectId,
      name: "general",
    });

    if (!generalChannel) {
      generalChannel = await Channel.create({
        name: "general",
        description: "Company-wide general discussions and announcements",
        isPinned: true,
        isActive: true,
        isPrivate: false,
        createdBy: userObjectId,
        tenantId: tenantObjectId,
      });
    }

    const broadcastedCelebrants: string[] = [];

    // ─────────────────────────────────────────────────────────────
    // 2. Chat Announcements for Today's Birthdays
    // ─────────────────────────────────────────────────────────────
    for (const bday of birthdayResults.today) {
      // Check if already posted today
      const alreadyPosted = await ChatMessage.findOne({
        tenantId: tenantObjectId,
        channel: "general",
        createdAt: { $gte: startOfToday },
        content: new RegExp(`TODAY'S TEAM BIRTHDAY CELEBRATION!.*${bday.name}`, "i"),
      });

      if (!alreadyPosted) {
        const messageContent = [
          `🎉 🎂 **TODAY'S TEAM BIRTHDAY CELEBRATION!** 🎂 🎉`,
          `Let's celebrate **${bday.name}** from **${bday.department || "the team"}**!`,
          `*"Wishing you a fantastic birthday filled with happiness, good health, and great milestones! Thank you for being such an inspiring part of our team."* ✨🍰`,
          `👉 *Head over to the celebrations widget on your dashboard to send a wish & photos!*`,
        ].join("\n\n");

        await ChatMessage.create({
          channel: "general",
          senderId: userObjectId,
          senderName: "Celebrations Bot",
          senderRole: "Bot",
          content: messageContent,
          isDM: false,
          tenantId: tenantObjectId,
        });

        broadcastedCelebrants.push(bday.name);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Chat Announcements for Today's Anniversaries
    // ─────────────────────────────────────────────────────────────
    for (const anniv of anniversaryResults.today) {
      const alreadyPosted = await ChatMessage.findOne({
        tenantId: tenantObjectId,
        channel: "general",
        createdAt: { $gte: startOfToday },
        content: new RegExp(`WORK ANNIVERSARY CELEBRATION!.*${anniv.name}`, "i"),
      });

      if (!alreadyPosted) {
        const milestone = anniv.milestoneText || `${anniv.milestoneYears || 1} Year Milestone`;
        const messageContent = [
          `🏆 🌟 **WORK ANNIVERSARY CELEBRATION!** 🌟 🏆`,
          `Huge congratulations to **${anniv.name}** (${anniv.department}) celebrating their **${milestone}** with us!`,
          `*"Thank you for your dedication, brilliance, and tremendous contributions to our journey! Here's to many more victories together!"* 🥂👏`,
          `👉 *Send your congratulations directly from the Celebrations widget!*`,
        ].join("\n\n");

        await ChatMessage.create({
          channel: "general",
          senderId: userObjectId,
          senderName: "Celebrations Bot",
          senderRole: "Bot",
          content: messageContent,
          isDM: false,
          tenantId: tenantObjectId,
        });

        broadcastedCelebrants.push(`${anniv.name} (Anniversary)`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 3-Day Advance Notice for HR & Managers
    // ─────────────────────────────────────────────────────────────
    const advanceNoticeCount: number = 0;
    const allUpcoming = [
      ...birthdayResults.upcoming.map((u) => ({ ...u, kind: "Birthday" })),
      ...anniversaryResults.upcoming.map((u) => ({ ...u, kind: "Work Anniversary" })),
    ].filter((u) => u.daysRemaining === 3);

    for (const item of allUpcoming) {
      const celebrantUser = normalizedUsers.find((u) => u._id === item.userId);
      if (!celebrantUser) continue;

      const targetRecipients: string[] = [];
      if (celebrantUser.hrId) targetRecipients.push(celebrantUser.hrId.toString());
      if (celebrantUser.managerId) targetRecipients.push(celebrantUser.managerId.toString());

      // If no manager/hr linked, find HR/Admin roles
      if (targetRecipients.length === 0) {
        const hrAdmins = normalizedUsers
          .filter((u) => ["Admin", "HR", "OPS"].includes(u.role))
          .map((u) => u._id);
        targetRecipients.push(...hrAdmins.slice(0, 3));
      }

      for (const recipientId of Array.from(new Set(targetRecipients))) {
        // Prevent duplicate advance alert today
        const existingNotice = await Notification.findOne({
          recipientId,
          tenantId: tenantObjectId,
          createdAt: { $gte: startOfToday },
          title: new RegExp(`Upcoming ${item.kind}: ${item.name}`, "i"),
        });

        if (!existingNotice) {
          await Notification.create({
            recipientId,
            title: `📅 Upcoming ${item.kind}: ${item.name} in 3 Days!`,
            message: `${item.name} (${item.department}) is celebrating their ${item.kind} on ${item.displayDate}. Plan cakes, gifts, or team recognitions!`,
            type: "hr",
            linkUrl: "/dashboard",
            tenantId: tenantObjectId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      broadcastedCelebrants,
      upcomingNoticeCount: allUpcoming.length,
    });
  } catch (error: any) {
    console.error("[POST /api/birthdays/broadcast] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
