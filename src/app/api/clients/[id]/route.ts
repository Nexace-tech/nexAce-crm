import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { getUserDataScope } from "@/lib/dataScope";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * GET single client
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const client = await Client.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const dataScope = await getUserDataScope(session);
    const isElevatedRole =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      dataScope.scope === "all" ||
      dataScope.canViewFeature("viewClients");

    const isOwner = client.uploadedBy?.toString() === session.userId;
    const escapedName = session.userName ? session.userName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") : "";
    const isDeliveryOwner = new RegExp(escapedName, "i").test(client.deliveryOwner || "");

    if (!isElevatedRole && !isOwner && !isDeliveryOwner) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    return NextResponse.json({ client });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update client retainer details OR add a contact log entry
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    const canEdit =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      dataScope.canViewFeature("editClients") ||
      dataScope.canViewFeature("manageDeals");

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: Permission required to edit clients" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();

    const client = await Client.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Mode A: Log retainer hours used
    if (typeof body.logHours === "number") {
      client.usedHours = (client.usedHours || 0) + body.logHours;
    }

    // Mode B: Add contact history interaction log
    if (body.contactLog) {
      const { type, summary } = body.contactLog;
      client.contactHistory.push({
        date: new Date(),
        type: type || "Note",
        summary: summary || "Client interaction logged.",
        authorName: session.userName,
      });
    }

    // Mode C: Update fields directly
    if (body.projectId) client.projectId = body.projectId;
    if (body.clientAccount) {
      client.clientAccount = body.clientAccount;
      client.name = body.clientAccount;
      client.company = body.clientAccount;
    }
    if (body.venture) client.venture = body.venture;
    if (body.projectName) client.projectName = body.projectName;
    if (body.deliveryOwner) client.deliveryOwner = body.deliveryOwner;
    if (body.phase) {
      client.phase = body.phase;
      client.status = body.phase === "On Hold" ? "On Hold" : body.phase?.startsWith("Closed") ? "Archived" : "Active";
    }
    if (body.priority) client.priority = body.priority;
    if (body.startDate) client.startDate = new Date(body.startDate);
    if (body.targetEndDate) client.targetEndDate = new Date(body.targetEndDate);
    if (body.health) client.health = body.health;
    if (body.billingType) client.billingType = body.billingType;
    if (body.estHours !== undefined) {
      client.estHours = Number(body.estHours);
      client.retainerHours = Number(body.estHours);
    }
    if (body.actualHours !== undefined) {
      client.actualHours = Number(body.actualHours);
      client.usedHours = Number(body.actualHours);
    }
    if (body.progressPercent !== undefined) client.progressPercent = Number(body.progressPercent);
    if (body.notes !== undefined) client.notes = body.notes;

    await client.save();

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}

/**
 * DELETE client
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    const canDelete =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      dataScope.canViewFeature("deleteClients");

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: Permission required to delete clients" }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const client = await Client.findOneAndDelete({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}
