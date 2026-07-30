import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { TenantSubscription } from "@/models/TenantSubscription";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch tenant subscription details & active seat counts
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    // Count current active users in tenant
    const activeSeats = await User.countDocuments({ tenantId: tenantIdObj });

    let subscription = await TenantSubscription.findOne({ tenantId: tenantIdObj });

    if (!subscription) {
      // Auto-create default subscription for workspace
      subscription = await TenantSubscription.create({
        tenantId: tenantIdObj,
        planName: "Enterprise Team Tier",
        maxSeats: 100,
        activeSeats,
        billingCycle: "Monthly",
        status: "Active",
        amount: 299,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
      });
    } else {
      // Sync seat count
      subscription.activeSeats = activeSeats;
      await subscription.save();
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error("API GET Billing Subscription error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update subscription plan or max seats (Admin only)
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const { planName, maxSeats, billingCycle, amount } = body;

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const subscription = await TenantSubscription.findOne({ tenantId: tenantIdObj });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription record not found" }, { status: 404 });
    }

    if (planName) subscription.planName = planName;
    if (maxSeats) subscription.maxSeats = Number(maxSeats);
    if (billingCycle) subscription.billingCycle = billingCycle;
    if (amount !== undefined) subscription.amount = Number(amount);

    await subscription.save();

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("API PUT Billing Subscription error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
