import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch company / organization tenant details
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const tenant = await Tenant.findById(tenantIdObj).lean();
    if (!tenant) {
      return NextResponse.json({ error: "Company details not found" }, { status: 404 });
    }

    const totalUsers = await User.countDocuments({ tenantId: tenantIdObj });

    return NextResponse.json({
      company: {
        ...tenant,
        totalUsers,
      },
    });
  } catch (error: any) {
    console.error("API GET Company details error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update company / organization name (Admin only)
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const tenant = await Tenant.findById(tenantIdObj);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    tenant.name = name.trim();
    tenant.slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await tenant.save();

    return NextResponse.json({ success: true, company: tenant });
  } catch (error: any) {
    console.error("API PUT Company details error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
