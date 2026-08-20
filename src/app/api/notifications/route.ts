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

    const { tenantObjectId, userObjectId, session } = authResult;
    await connectToDatabase();

    const isAdminLevel = ["Admin", "OPS"].includes(session.role);

    // Admin-operational notification titles that non-admin roles should never see
    const ADMIN_ONLY_TITLES = [
      "New Employee Added",
      "New Employee Account Pending Approval",
    ];

    // Build filter: non-admin users are excluded from adminOnly notifications
    // and from legacy notifications that match known admin-only title patterns
    const baseFilter: Record<string, unknown> = {
      tenantId: tenantObjectId,
      recipientId: userObjectId,
    };

    if (!isAdminLevel) {
      baseFilter["$and"] = [
        { adminOnly: { $ne: true } },
        { title: { $nin: ADMIN_ONLY_TITLES } },
      ];
    }

    const notifications = await Notification.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...baseFilter,
      read: false,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Notifications error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new notification or broadcast to all tenant members.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId, session } = authResult;
    const body = await request.json();
    const { recipientId, title, message, type, linkUrl, broadcast } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and Message are required" }, { status: 400 });
    }

    await connectToDatabase();

    if (broadcast) {
      // Only privileged roles may broadcast to the entire tenant; prevent Employee spam/abuse
      if (!["Admin", "OPS", "Manager", "HR"].includes(session.role)) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions to broadcast notifications" }, { status: 403 });
      }

      // Import User model dynamically to get all tenant members
      const { User } = await import("@/models/User");
      const tenantUsers = await User.find({ tenantId: tenantObjectId }).select("_id");
      
      const docs = tenantUsers.map((u) => ({
        recipientId: u._id,
        title: title.trim(),
        message: message.trim(),
        type: type || "announcement",
        linkUrl: linkUrl || "",
        read: false,
        tenantId: tenantObjectId,
      }));

      await Notification.insertMany(docs);
      return NextResponse.json({ message: `Broadcast sent to ${docs.length} team members` }, { status: 201 });
    }

    // Restrict specifying custom recipientId to Admin role only to prevent unauthorized user notifications
    const targetRecipientId = (session.role === "Admin" && recipientId) ? recipientId : userObjectId;

    const newNotification = await Notification.create({
      recipientId: targetRecipientId,
      title: title.trim(),
      message: message.trim(),
      type: type || "system",
      linkUrl: linkUrl || "",
      read: false,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ notification: newNotification }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Notification error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PATCH Notification error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Delete single notification or clear all notifications for the user.
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    await connectToDatabase();

    if (clearAll) {
      await Notification.deleteMany({ tenantId: tenantObjectId, recipientId: userObjectId });
      return NextResponse.json({ message: "Cleared all notifications" });
    }

    if (notificationId) {
      await Notification.deleteOne({ _id: notificationId, tenantId: tenantObjectId, recipientId: userObjectId });
      return NextResponse.json({ message: "Notification deleted" });
    }

    return NextResponse.json({ error: "Notification ID or clearAll required" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Notification error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
