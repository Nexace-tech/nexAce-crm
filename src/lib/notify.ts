import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

type NotifyType =
  | "chat"
  | "announcement"
  | "task"
  | "leave"
  | "hr"
  | "appraisal"
  | "kudos"
  | "okr"
  | "referral"
  | "system";

interface NotifyPayload {
  title: string;
  message: string;
  type: NotifyType;
  linkUrl?: string;
}

/**
 * Shared notification utility used by all API routes.
 * Creates notification documents for one or many recipients.
 * Never throws — errors are logged but never block the main request.
 *
 * @param tenantId   - Tenant ObjectId or string
 * @param recipients - Single id, array of ids, or "broadcast" to notify all tenant users
 * @param payload    - { title, message, type, linkUrl }
 */
export async function notify(
  tenantId: mongoose.Types.ObjectId | string,
  recipients: mongoose.Types.ObjectId | string | (mongoose.Types.ObjectId | string)[] | "broadcast",
  payload: NotifyPayload
): Promise<void> {
  try {
    await connectToDatabase();

    const tenantObjId =
      typeof tenantId === "string"
        ? new mongoose.Types.ObjectId(tenantId)
        : tenantId;

    let recipientIds: mongoose.Types.ObjectId[];

    if (recipients === "broadcast") {
      const users = await User.find({ tenantId: tenantObjId }).select("_id").lean();
      recipientIds = users.map((u: any) => new mongoose.Types.ObjectId(u._id.toString()));
    } else if (Array.isArray(recipients)) {
      recipientIds = recipients.map((r) =>
        typeof r === "string" ? new mongoose.Types.ObjectId(r) : new mongoose.Types.ObjectId(r.toString())
      );
    } else {
      recipientIds = [
        typeof recipients === "string"
          ? new mongoose.Types.ObjectId(recipients)
          : new mongoose.Types.ObjectId(recipients.toString()),
      ];
    }

    if (recipientIds.length === 0) return;

    // Deduplicate: Don't insert duplicate notifications for the same recipient & content sent within the last 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentDuplicates = await Notification.find({
      tenantId: tenantObjId,
      recipientId: { $in: recipientIds },
      title: payload.title,
      message: payload.message,
      createdAt: { $gte: fiveSecondsAgo },
    }).select("recipientId").lean();

    const recentDupIds = new Set(recentDuplicates.map((d: any) => d.recipientId.toString()));
    const uniqueRecipientIds = recipientIds.filter((id) => !recentDupIds.has(id.toString()));

    if (uniqueRecipientIds.length === 0) return;

    const docs = uniqueRecipientIds.map((rid) => ({
      tenantId: tenantObjId,
      recipientId: rid,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      linkUrl: payload.linkUrl || "",
      read: false,
    }));

    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error("[notify] Failed to create notification(s):", err);
  }
}

/**
 * Convenience helper: notify all users with specific roles in a tenant.
 */
export async function notifyAdmins(
  tenantId: mongoose.Types.ObjectId | string,
  payload: NotifyPayload,
  includeRoles: string[] = ["Admin"],
  excludeUserId?: string
): Promise<void> {
  try {
    await connectToDatabase();

    const tenantObjId =
      typeof tenantId === "string"
        ? new mongoose.Types.ObjectId(tenantId)
        : tenantId;

    const admins = await User.find({
      tenantId: tenantObjId,
      role: { $in: includeRoles },
    })
      .select("_id")
      .lean();

    if (admins.length === 0) return;

    let recipientIds = admins.map((u: any) => u._id.toString());
    if (excludeUserId) {
      recipientIds = recipientIds.filter((id) => id !== excludeUserId.toString());
    }

    if (recipientIds.length === 0) return;

    await notify(tenantId, recipientIds, payload);
  } catch (err) {
    console.error("[notifyAdmins] Failed:", err);
  }
}
