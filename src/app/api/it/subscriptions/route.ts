import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITSubscription } from "@/models/ITSubscription";
import { ActivityLog } from "@/models/ActivityLog";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { sendEmail } from "@/lib/mail";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

const SEED_SUBSCRIPTIONS = [
  { tool: "Slack Pro", category: "Communication", plan: "Pro", costPerMonth: 87.50, seats: 25, renewalDate: "2026-09-01", owner: "Ahmed Raza", status: "Active" },
  { tool: "Notion Team", category: "Knowledge Base", plan: "Team", costPerMonth: 40.00, seats: 20, renewalDate: "2026-08-20", owner: "Sara Khan", status: "Expiring Soon" },
  { tool: "Google Workspace Business", category: "Productivity", plan: "Business Starter", costPerMonth: 126.00, seats: 30, renewalDate: "2026-10-15", owner: "Omar Malik", status: "Active" },
  { tool: "GitHub Teams", category: "Dev Tools", plan: "Team", costPerMonth: 20.00, seats: 10, renewalDate: "2026-11-01", owner: "Zain Ali", status: "Active" },
  { tool: "Figma Professional", category: "Design", plan: "Professional", costPerMonth: 36.00, seats: 6, renewalDate: "2026-08-31", owner: "Fatima Noor", status: "Expiring Soon" },
  { tool: "AWS", category: "Infrastructure", plan: "Pay-as-you-go", costPerMonth: 340.00, seats: 1, renewalDate: "2026-12-31", owner: "Bilal Hassan", status: "Active" },
  { tool: "Canva Pro", category: "Design", plan: "Pro", costPerMonth: 16.99, seats: 5, renewalDate: "2026-09-15", owner: "Mariam Siddiqui", status: "Active" },
  { tool: "Zoom Business", category: "Communication", plan: "Business", costPerMonth: 24.99, seats: 10, renewalDate: "2026-07-01", owner: "Hassan Shah", status: "Expired" },
  { tool: "HubSpot Starter", category: "CRM", plan: "Starter", costPerMonth: 45.00, seats: 5, renewalDate: "2026-10-20", owner: "Ayesha Qureshi", status: "Active" },
  { tool: "Loom Business", category: "Communication", plan: "Business", costPerMonth: 12.50, seats: 5, renewalDate: "2026-06-01", owner: "Tariq Hussain", status: "Cancelled" },
];

async function checkAndNotifyExpiringSubscriptions(tenantObjectId: mongoose.Types.ObjectId) {
  try {
    const subs = await ITSubscription.find({
      tenantId: tenantObjectId,
      status: { $ne: "Cancelled" },
      renewalDate: { $exists: true, $ne: "" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sub of subs) {
      if (!sub.renewalDate) continue;
      const renewal = new Date(sub.renewalDate);
      if (isNaN(renewal.getTime())) continue;
      renewal.setHours(0, 0, 0, 0);

      const diffTime = renewal.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newStatus = sub.status;
      if (diffDays < 0) {
        newStatus = "Expired";
      } else if (diffDays <= 7) {
        newStatus = "Expiring Soon";
      } else {
        newStatus = "Active";
      }

      if (newStatus !== sub.status) {
        await ITSubscription.updateOne({ _id: sub._id }, { $set: { status: newStatus } });
      }

      // If expiring in 7 days or today, notify Admin and User
      if (diffDays <= 7 && diffDays >= 0) {
        const notifTitle = `Subscription Expiring Soon: ${sub.tool}`;
        const existingNotif = await Notification.findOne({
          tenantId: tenantObjectId,
          title: notifTitle,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });

        if (!existingNotif) {
          const recipients = await User.find({
            tenantId: tenantObjectId,
            $or: [
              { role: { $in: ["Admin", "OPS", "Sub Admin"] } },
              ...(sub.createdBy ? [{ _id: sub.createdBy }] : []),
            ],
          }).select("_id email name");

          const uniqueRecipients = Array.from(new Map(recipients.map((r) => [r._id.toString(), r])).values());

          for (const recipient of uniqueRecipients) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: recipient._id,
              title: notifTitle,
              message: `The subscription for "${sub.tool}" (${sub.plan || "Plan"}) expires on ${sub.renewalDate} (${diffDays === 0 ? "Today" : `in ${diffDays} day(s)`}). Please renew or review it.`,
              type: "system",
              linkUrl: "/dashboard/it",
            });

            if (recipient.email) {
              sendEmail({
                to: recipient.email,
                subject: `[NexAce IT Alert] Subscription Expiring Soon: ${sub.tool}`,
                text: `Hello ${recipient.name},\n\nThe subscription for "${sub.tool}" is expiring on ${sub.renewalDate} (${diffDays === 0 ? "Today" : `in ${diffDays} day(s)`}).\n\nLog in to NexAce CRM to renew or review details.`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #ea580c; margin-bottom: 8px;">Subscription Expiring Alert</h2>
                    <p style="color: #475569; font-size: 14px;">Hello <strong>${recipient.name}</strong>,</p>
                    <p style="color: #475569; font-size: 14px;">Your organization's subscription for <strong>${sub.tool}</strong> is expiring soon:</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Tool:</strong> ${sub.tool}</p>
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Plan:</strong> ${sub.plan || "Standard"}</p>
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Monthly Cost:</strong> ₹${sub.costPerMonth}</p>
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Renewal Date:</strong> ${sub.renewalDate} (${diffDays === 0 ? "Today" : `in ${diffDays} day(s)`})</p>
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #ea580c; font-weight: bold;">Expiring Soon</span></p>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">Please review in the IT Portal to avoid service disruption.</p>
                  </div>
                `,
              }).catch(() => {});
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Subscription expiry check error:", err);
  }
}

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    // Check and notify for expiring subscriptions automatically
    await checkAndNotifyExpiringSubscriptions(tenantObjectId);

    const filter: Record<string, unknown> = { tenantId: tenantObjectId };
    if (!isPrivileged) {
      filter.$or = [{ createdBy: userObjectId }, { owner: session.userName }];
    }

    let subs = await ITSubscription.find(filter).sort({ createdAt: -1 }).lean();

    if (subs.length === 0 && isPrivileged) {
      const seedDocs = SEED_SUBSCRIPTIONS.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITSubscription.insertMany(seedDocs);
      subs = await ITSubscription.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ subscriptions: subs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/subscriptions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { tool, category, plan, costPerMonth, seats, renewalDate, owner, status } = body;

    if (!tool?.trim()) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await ITSubscription.create({
      tenantId: tenantObjectId,
      tool: tool.trim(),
      category: category?.trim() || "",
      plan: plan?.trim() || "",
      costPerMonth: Number(costPerMonth) || 0,
      seats: Number(seats) || 1,
      renewalDate: renewalDate || "",
      owner: owner?.trim() || "",
      status: status || "Active",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_SUBSCRIPTION_ADDED",
      targetName: tool.trim(),
      details: `Added subscription for "${tool.trim()}" (${plan || "N/A"}) at ₹${costPerMonth || 0}/mo`,
    });

    return NextResponse.json({ subscription: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/subscriptions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
