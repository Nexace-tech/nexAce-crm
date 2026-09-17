import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { User } from "@/models/User";

export async function autoGenerateSubscriptionInvoice({
  sub,
  tenantObjectId,
  userObjectId,
  userName,
}: {
  sub: any;
  tenantObjectId: mongoose.Types.ObjectId;
  userObjectId?: mongoose.Types.ObjectId;
  userName?: string;
}) {
  if (!sub.costPerMonth || Number(sub.costPerMonth) <= 0) return null;

  await connectToDatabase();

  // Create clean deterministic invoice number per subscription billing cycle
  const toolSlug = (sub.tool || "SUB").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
  const cycleDate = (sub.renewalDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const invoiceNo = `INV-SUB-${toolSlug}-${cycleDate}`;

  // Check if invoice already exists for this tenant & invoiceNo or subscriptionId + cycleDate
  const existing = await ITInvoice.findOne({
    tenantId: tenantObjectId,
    $or: [
      { invoiceNo },
      { subscriptionId: sub._id, invoiceDate: sub.renewalDate || new Date().toISOString().slice(0, 10) },
    ],
  });
  if (existing) return existing;

  const cost = Number(sub.costPerMonth) || 0;
  const seats = Number(sub.seats) || 1;
  const plan = sub.plan || "Standard";
  const invDate = sub.startDate ? new Date(sub.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const dueDate = sub.renewalDate || invDate;

  // Determine createdBy: fallback to sub.createdBy or an Admin user
  let creatorId = sub.createdBy;
  if (!creatorId) {
    const adminUser = await User.findOne({ tenantId: tenantObjectId, role: { $in: ["Admin", "OPS"] } }).select("_id").lean();
    creatorId = adminUser?._id || userObjectId;
  }

  // Determine billedToName:
  let billedTo = (sub.owner || "").trim();
  if (!billedTo && sub.createdBy) {
    const subCreator = await User.findById(sub.createdBy).select("name role").lean();
    if (subCreator && !["Admin", "OPS", "Sub Admin"].includes(subCreator.role)) {
      billedTo = subCreator.name;
    }
  }
  if (!billedTo) {
    billedTo = "IT Department";
  }

  const invoice = await ITInvoice.create({
    tenantId: tenantObjectId,
    subscriptionId: sub._id,
    invoiceNo,
    invoiceDate: invDate,
    dueDate,
    customerNo: `SUB-${sub._id ? sub._id.toString().slice(-6).toUpperCase() : toolSlug}`,
    businessName: `${sub.tool} Provider`,
    businessAddress: "Cloud Software & SaaS Services",
    businessEmail: `billing@${sub.tool.toLowerCase().replace(/[^a-z0-9]/g, "") || "vendor"}.com`,
    billedToName: billedTo,
    billedToAddress: "NexAce Technologies",
    billedToEmail: "",
    items: [
      {
        description: `${sub.tool} - ${plan} (${seats} Seat${seats > 1 ? "s" : ""})`,
        quantity: seats,
        unitPrice: Math.round((cost / seats) * 100) / 100,
        amount: cost,
      },
    ],
    subtotal: cost,
    taxRate: 0,
    taxAmount: 0,
    total: cost,
    currency: "INR",
    status: sub.status === "Expired" ? "Overdue" : "Pending",
    notes: `Auto-generated subscription invoice for ${sub.tool} (${plan} plan). Renewal cycle: ${sub.renewalDate || "Current"}.`,
    createdBy: creatorId,
  });

  // Log activity
  if (creatorId) {
    try {
      await ActivityLog.create({
        tenantId: tenantObjectId,
        userId: creatorId,
        userName: userName || "System Auto-Billing",
        userRole: "System",
        action: "IT_INVOICE_CREATED",
        targetName: invoiceNo,
        details: `Auto-generated subscription invoice ${invoiceNo} for ${sub.tool} (₹${cost})`,
      });
    } catch {
      // non-critical
    }
  }

  return invoice;
}

export async function autoGenerateAllSubscriptionInvoices({
  tenantObjectId,
  userObjectId,
  userName,
  ownerFilter,
}: {
  tenantObjectId: mongoose.Types.ObjectId;
  userObjectId?: mongoose.Types.ObjectId;
  userName?: string;
  ownerFilter?: string;
}) {
  await connectToDatabase();
  const { ITSubscription } = await import("@/models/ITSubscription");
  const query: Record<string, any> = {
    tenantId: tenantObjectId,
    costPerMonth: { $gt: 0 },
    status: { $ne: "Cancelled" },
  };
  if (ownerFilter) {
    const ownerRegex = new RegExp(`^${ownerFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (userObjectId) {
      query.$or = [{ owner: ownerRegex }, { createdBy: userObjectId }];
    } else {
      query.owner = ownerRegex;
    }
  }

  const subs = await ITSubscription.find(query);

  const generatedInvoices = [];
  for (const sub of subs) {
    const inv = await autoGenerateSubscriptionInvoice({
      sub,
      tenantObjectId,
      userObjectId,
      userName,
    });
    if (inv) generatedInvoices.push(inv);
  }
  return generatedInvoices;
}
