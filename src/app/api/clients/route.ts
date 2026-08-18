import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { getSession } from "@/lib/session";
import { getUserDataScope } from "@/lib/dataScope";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * GET: Fetch all client retainers for the authenticated tenant.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    await connectToDatabase();

    const dataScope = await getUserDataScope(session);
    const isElevatedRole =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      dataScope.scope === "all" ||
      dataScope.canViewFeature("viewClients");

    const queryCondition: any = { tenantId: tenantObjectId };

    if (!isElevatedRole) {
      const escapedName = session.userName ? session.userName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") : "";
      queryCondition.$or = [
        { uploadedBy: userObjectId },
        { deliveryOwner: { $regex: new RegExp(escapedName, "i") } }
      ];
    }

    const clients = await Client.find(queryCondition).sort({ createdAt: -1 });

    return NextResponse.json({ clients });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Clients error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new client retainer profile.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    const canCreate =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      dataScope.canViewFeature("createClients");

    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: Permission required to create clients" }, { status: 403 });
    }

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const body = await request.json();

    const {
      projectId,
      clientAccount,
      venture,
      projectName,
      deliveryOwner,
      phase,
      priority,
      startDate,
      targetEndDate,
      health,
      billingType,
      estHours,
      actualHours,
      progressPercent,
      notes,
    } = body;

    if (!clientAccount || !projectName) {
      return NextResponse.json({ error: "Client account and project name are required" }, { status: 400 });
    }

    await connectToDatabase();

    const newClient = await Client.create({
      tenantId: tenantObjectId,
      uploadedBy: userObjectId,
      name: clientAccount,
      company: clientAccount,
      clientAccount,
      projectId,
      venture: venture || "",
      projectName,
      deliveryOwner: deliveryOwner || session.userName,
      phase: phase || "In Delivery",
      priority: priority || "Medium",
      startDate: startDate ? new Date(startDate) : new Date(),
      targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      health: health || "Green",
      billingType: billingType || "Retainer",
      estHours: Number(estHours) || 0,
      actualHours: Number(actualHours) || 0,
      retainerHours: Number(estHours) || 0,
      usedHours: Number(actualHours) || 0,
      progressPercent: Number(progressPercent) || 0,
      notes: notes || "",
    });

    return NextResponse.json({ success: true, client: newClient }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Clients error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
