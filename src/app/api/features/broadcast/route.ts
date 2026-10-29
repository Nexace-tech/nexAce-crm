import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { FeatureBroadcast } from "@/models/FeatureBroadcast";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/features/broadcast?releaseId=...
 * Fetch tenant broadcast configuration for a specific release
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get("releaseId") || "release-2026-10-hrms-suite";

    await connectToDatabase();

    const broadcast = await FeatureBroadcast.findOne({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      releaseId,
    });

    if (!broadcast) {
      return NextResponse.json({
        isBroadcasted: false,
        targetRoles: ["Employee", "Manager", "HR", "OPS"],
        enabledFeatures: [],
        dismissedByAdmin: false,
        broadcastedAt: null,
      });
    }

    return NextResponse.json({
      isBroadcasted: broadcast.isBroadcasted,
      targetRoles: broadcast.targetRoles || ["Employee", "Manager", "HR", "OPS"],
      enabledFeatures: broadcast.enabledFeatures || [],
      dismissedByAdmin: broadcast.dismissedByAdmin || false,
      broadcastedAt: broadcast.broadcastedAt || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/features/broadcast error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/features/broadcast
 * Admin approves / updates broadcast permission & audience for a release
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Root Admin access required to manage broadcasts" }, { status: 403 });
    }

    const body = await request.json();
    const { releaseId, isBroadcasted, targetRoles, enabledFeatures, dismissedByAdmin } = body;

    if (!releaseId) {
      return NextResponse.json({ error: "releaseId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updateData: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      releaseId,
      isBroadcasted: Boolean(isBroadcasted),
      targetRoles: Array.isArray(targetRoles) ? targetRoles : ["Employee", "Manager", "HR", "OPS"],
      enabledFeatures: Array.isArray(enabledFeatures) ? enabledFeatures : [],
      dismissedByAdmin: Boolean(dismissedByAdmin),
    };

    if (isBroadcasted) {
      updateData.broadcastedAt = new Date();
      updateData.broadcastedBy = new mongoose.Types.ObjectId(session.userId);
    }

    const updatedDoc = await FeatureBroadcast.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        releaseId,
      },
      { $set: updateData },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ success: true, broadcast: updatedDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/features/broadcast error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

