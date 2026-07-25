import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * GET: Fetch unread and recent notifications for the logged-in user.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    await connectToDatabase();

    const notifications = await Notification.find({
      tenantId: tenantObjectId,
      recipientId: userObjectId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      tenantId: tenantObjectId,
      recipientId: userObjectId,
      read: false,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("API GET Notifications error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new notification.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { recipientId, title, message, type, linkUrl } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and Message are required" }, { status: 400 });
    }

    await connectToDatabase();

    const newNotification = await Notification.create({
      recipientId: recipientId || userObjectId,
      title: title.trim(),
      message: message.trim(),
      type: type || "system",
      linkUrl: linkUrl || "",
      read: false,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ notification: newNotification }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Notification error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Mark notification(s) as read.
 */
export async function PATCH(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    await connectToDatabase();

    if (markAllRead) {
      await Notification.updateMany(
        { tenantId: tenantObjectId, recipientId: userObjectId, read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, tenantId: tenantObjectId, recipientId: userObjectId },
        { $set: { read: true } }
      );
      return NextResponse.json({ message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (error: any) {
    console.error("API PATCH Notification error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
