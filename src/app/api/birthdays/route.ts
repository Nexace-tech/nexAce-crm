import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { BirthdayWish } from "@/models/BirthdayWish";
import { evaluateCelebrations, getMonthAndDay, getAnniversaryMilestone } from "@/lib/birthdays/date-utils";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    // 1. Fetch active team members in this tenant
    const activeUsers = await User.find({
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
    })
      .select("_id name username email role department photoUrl phone dob joinDate preferences")
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
    }));

    // 2. Evaluate Birthdays and Work Anniversaries
    const now = new Date();
    const currentYear = now.getFullYear();

    const birthdayResults = evaluateCelebrations(normalizedUsers, "birthday", 14, now);
    const anniversaryResults = evaluateCelebrations(normalizedUsers, "anniversary", 14, now);

    const isMyBirthday = birthdayResults.today.some((u) => u.userId === session.userId);
    const isMyAnniversary = anniversaryResults.today.some((u) => u.userId === session.userId);

    // 3. Fetch wishes received by the requesting user across all history
    const receivedWishes = await BirthdayWish.find({
      tenantId: tenantObjectId,
      recipientId: userObjectId,
    })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch list of wishes sent by this user across all history (populated with recipient details)
    const sentWishes = await BirthdayWish.find({
      tenantId: tenantObjectId,
      senderId: userObjectId,
    })
      .populate("recipientId", "name photoUrl department")
      .sort({ createdAt: -1 })
      .lean();

    const formattedSentWishes = sentWishes.map((w: any) => ({
      _id: w._id.toString(),
      recipientId: w.recipientId?._id?.toString() || w.recipientId?.toString(),
      recipientName: w.recipientId?.name || "Colleague",
      recipientPhotoUrl: w.recipientId?.photoUrl || "",
      recipientDepartment: w.recipientId?.department || "",
      senderId: w.senderId.toString(),
      senderName: w.senderName,
      senderPhotoUrl: w.senderPhotoUrl,
      senderDepartment: w.senderDepartment,
      message: w.message,
      sticker: w.sticker,
      type: w.type,
      attachments: w.attachments || [],
      reactions: w.reactions || [],
      year: w.year,
      acknowledged: w.acknowledged,
      createdAt: w.createdAt,
    }));

    const wishesSentThisYear = sentWishes
      .filter((w: any) => w.year === currentYear)
      .map((w: any) => ({
        recipientId: (w.recipientId?._id || w.recipientId).toString(),
        type: w.type as "birthday" | "anniversary",
      }));

    // Find my celebration details if today is my day
    const myBirthdayItem = birthdayResults.today.find((u) => u.userId === session.userId) || null;
    const myAnniversaryItem = anniversaryResults.today.find((u) => u.userId === session.userId) || null;

    // 5. Aggregate wish counts per recipient for this calendar year
    const wishCounts = await BirthdayWish.aggregate([
      { $match: { tenantId: tenantObjectId, year: currentYear } },
      { $group: { _id: { recipientId: "$recipientId", type: "$type" }, count: { $sum: 1 } } },
    ]);
    const wishCountMap: Record<string, number> = {};
    for (const item of wishCounts) {
      if (item._id?.recipientId) {
        const key = `${item._id.recipientId.toString()}_${item._id.type}`;
        wishCountMap[key] = item.count;
      }
    }

    // 6. Build 12-month Annual Roster for whole organization
    const monthlyRoster: Record<number, Array<{
      userId: string;
      name: string;
      photoUrl?: string;
      department: string;
      role: string;
      phone?: string;
      day: number;
      month: number;
      type: "birthday" | "anniversary";
      label: string;
      wishesCount: number;
    }>> = {};

    for (let m = 1; m <= 12; m++) {
      monthlyRoster[m] = [];
    }

    for (const member of activeUsers) {
      // Birthdays (if not opted out)
      if ((member as any).preferences?.showBirthdayOnDashboard !== false && member.dob) {
        const md = getMonthAndDay(member.dob);
        if (md) {
          const uId = member._id.toString();
          monthlyRoster[md.month].push({
            userId: uId,
            name: member.name,
            photoUrl: member.photoUrl,
            department: member.department || "General",
            role: member.role || "Employee",
            phone: member.phone,
            day: md.day,
            month: md.month,
            type: "birthday",
            label: `Birthday (Day ${md.day})`,
            wishesCount: wishCountMap[`${uId}_birthday`] || 0,
          });
        }
      }

      // Work Anniversaries (if not opted out)
      if ((member as any).preferences?.showAnniversaryOnDashboard !== false && member.joinDate) {
        const origDate = new Date(member.joinDate);
        const joinYear = origDate.getFullYear();
        const yearsCompleted = currentYear - joinYear;

        if (yearsCompleted >= 1) {
          const md = getMonthAndDay(member.joinDate);
          if (md) {
            const uId = member._id.toString();
            monthlyRoster[md.month].push({
              userId: uId,
              name: member.name,
              photoUrl: member.photoUrl,
              department: member.department || "General",
              role: member.role || "Employee",
              phone: member.phone,
              day: md.day,
              month: md.month,
              type: "anniversary",
              label: `${getAnniversaryMilestone(yearsCompleted)} (Day ${md.day})`,
              wishesCount: wishCountMap[`${uId}_anniversary`] || 0,
            });
          }
        }
      }
    }

    // Sort each month by day ascending
    for (let m = 1; m <= 12; m++) {
      monthlyRoster[m].sort((a, b) => a.day - b.day);
    }

    return NextResponse.json({
      success: true,
      currentYear,
      isMyBirthday,
      isMyAnniversary,
      myCelebration: {
        birthday: myBirthdayItem,
        anniversary: myAnniversaryItem,
      },
      todayBirthdays: birthdayResults.today,
      upcomingBirthdays: birthdayResults.upcoming,
      todayAnniversaries: anniversaryResults.today,
      upcomingAnniversaries: anniversaryResults.upcoming,
      receivedWishes,
      sentWishes: formattedSentWishes,
      wishesSentThisYear,
      roster: monthlyRoster,
      stats: {
        todayTotal: birthdayResults.today.length + anniversaryResults.today.length,
        upcomingTotal: birthdayResults.upcoming.length + anniversaryResults.upcoming.length,
        receivedWishesCount: receivedWishes.length,
        sentWishesCount: formattedSentWishes.length,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/birthdays] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
