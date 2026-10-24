import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { BirthdayWish } from "@/models/BirthdayWish";
import { getMonthAndDay, getAnniversaryMilestone } from "@/lib/birthdays/date-utils";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId } = authResult;

    // Check elevated role access
    const norm = (session.role || "").trim().toLowerCase();
    const isElevated = ["admin", "hr", "ops", "sub admin", "subadmin", "manager"].includes(norm);
    if (!isElevated) {
      return NextResponse.json(
        { error: "Forbidden: HR, Admin or OPS role required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. Fetch active team members in tenant
    const teamMembers = await User.find({
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
    })
      .select("_id name email role department photoUrl phone dob joinDate preferences")
      .lean();

    // 2. Build 12-month Annual Roster
    const monthlyRoster: Record<number, Array<{
      userId: string;
      name: string;
      photoUrl?: string;
      department: string;
      role: string;
      day: number;
      type: "birthday" | "anniversary";
      label: string;
    }>> = {};

    for (let m = 1; m <= 12; m++) {
      monthlyRoster[m] = [];
    }

    for (const member of teamMembers) {
      // Birthdays (if not opted out)
      if ((member as any).preferences?.showBirthdayOnDashboard !== false && member.dob) {
        const md = getMonthAndDay(member.dob);
        if (md) {
          monthlyRoster[md.month].push({
            userId: member._id.toString(),
            name: member.name,
            photoUrl: member.photoUrl,
            department: member.department || "General",
            role: member.role || "Employee",
            day: md.day,
            type: "birthday",
            label: `Birthday (Day ${md.day})`,
          });
        }
      }

      // Work Anniversaries (if not opted out)
      if ((member as any).preferences?.showAnniversaryOnDashboard !== false && member.joinDate) {
        const origDate = new Date(member.joinDate);
        const joinYear = origDate.getFullYear();
        const yearsCompleted = currentYear - joinYear;

        // Skip members who joined this current year
        if (yearsCompleted >= 1) {
          const md = getMonthAndDay(member.joinDate);
          if (md) {
            monthlyRoster[md.month].push({
              userId: member._id.toString(),
              name: member.name,
              photoUrl: member.photoUrl,
              department: member.department || "General",
              role: member.role || "Employee",
              day: md.day,
              type: "anniversary",
              label: `${getAnniversaryMilestone(yearsCompleted)} (Day ${md.day})`,
            });
          }
        }
      }
    }

    // Sort each month by day ascending
    for (let m = 1; m <= 12; m++) {
      monthlyRoster[m].sort((a, b) => a.day - b.day);
    }

    // 3. Fetch Company-Wide Wishes Feed across all history
    const wishesFeed = await BirthdayWish.find({
      tenantId: tenantObjectId,
    })
      .populate("recipientId", "name email department photoUrl")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const formattedWishes = wishesFeed.map((w: any) => ({
      _id: w._id.toString(),
      recipientId: w.recipientId?._id?.toString() || w.recipientId?.toString(),
      recipientName: w.recipientId?.name || "Recipient",
      recipientDepartment: w.recipientId?.department || "",
      recipientPhotoUrl: w.recipientId?.photoUrl || "",
      senderId: w.senderId.toString(),
      senderName: w.senderName,
      senderDepartment: w.senderDepartment,
      senderPhotoUrl: w.senderPhotoUrl,
      message: w.message,
      sticker: w.sticker,
      type: w.type,
      attachments: w.attachments || [],
      attachmentsCount: (w.attachments || []).length,
      reactions: w.reactions || [],
      reactionsCount: (w.reactions || []).length,
      year: w.year,
      acknowledged: w.acknowledged,
      createdAt: w.createdAt,
    }));

    // 4. Stats
    const thisMonthCelebrationsCount = monthlyRoster[currentMonth]?.length || 0;

    return NextResponse.json({
      success: true,
      currentYear,
      currentMonth,
      monthlyRoster,
      wishesFeed: formattedWishes,
      wishes: formattedWishes,
      stats: {
        totalWishesThisYear: formattedWishes.length,
        totalWishes: formattedWishes.length,
        thisMonthCelebrations: thisMonthCelebrationsCount,
        totalTeamMembers: teamMembers.length,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/birthdays/admin] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
