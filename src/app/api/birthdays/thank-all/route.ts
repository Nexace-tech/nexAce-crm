import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { BirthdayWish } from "@/models/BirthdayWish";
import { Notification } from "@/models/Notification";

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const currentYear = new Date().getFullYear();

    // 1. Fetch all wishes received by the current user this year
    const wishes = await BirthdayWish.find({
      tenantId: tenantObjectId,
      recipientId: userObjectId,
      year: currentYear,
    });

    if (wishes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No wishes to acknowledge yet.",
        count: 0,
      });
    }

    // 2. Mark all as acknowledged
    await BirthdayWish.updateMany(
      {
        tenantId: tenantObjectId,
        recipientId: userObjectId,
        year: currentYear,
      },
      {
        $set: { acknowledged: true },
      }
    );

    // 3. Find unique senders (excluding self)
    const uniqueSenderIds = Array.from(
      new Set(
        wishes
          .map((w) => w.senderId.toString())
          .filter((id) => id !== session.userId)
      )
    );

    // 4. Dispatch reciprocal notifications
    const notificationsToCreate = uniqueSenderIds.map((senderId) => ({
      recipientId: senderId,
      title: `❤️ Thank You from ${session.userName}!`,
      message: `${session.userName} says: "Thank you so much for the lovely celebration wishes, photos, and kindness!"`,
      type: "kudos" as const,
      linkUrl: "/dashboard",
      tenantId: tenantObjectId,
    }));

    if (notificationsToCreate.length > 0) {
      try {
        await Notification.insertMany(notificationsToCreate);
      } catch (notifErr) {
        console.error("[POST /api/birthdays/thank-all] Notification batch error:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: uniqueSenderIds.length,
      message: `Sent heartfelt thanks to ${uniqueSenderIds.length} team member(s)!`,
    });
  } catch (error: any) {
    console.error("[POST /api/birthdays/thank-all] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
