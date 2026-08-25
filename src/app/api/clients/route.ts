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
 * POST: Create single client or bulk import multiple client retainer profiles.
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

    await connectToDatabase();

    // ── Handle Bulk Import ──────────────────────────────────────────────────
    if (body.bulk === true && Array.isArray(body.items)) {
      const validDocs: any[] = [];
      const errors: string[] = [];

      body.items.forEach((item: any, idx: number) => {
        const clientAccount = item.clientAccount || item.name || item.company;
        const projectName = item.projectName || item.project || `${clientAccount} Delivery`;

        if (!clientAccount) {
          errors.push(`Row ${idx + 1}: Missing clientAccount/company`);
          return;
        }

        validDocs.push({
          tenantId: tenantObjectId,
          uploadedBy: userObjectId,
          name: clientAccount,
          company: item.company || clientAccount,
          clientAccount,
          projectId: item.projectId || `CLP-${Date.now().toString().slice(-4)}-${idx + 1}`,
          venture: item.venture || "Ace Consultancys",
          projectName,
          deliveryOwner: item.deliveryOwner || session.userName || "Admin",
          phase: item.phase || "In Delivery",
          priority: item.priority || "Medium",
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          targetEndDate: item.targetEndDate ? new Date(item.targetEndDate) : undefined,
          health: item.health || "Green",
          billingType: item.billingType || "Retainer",
          monthlyValue: Number(item.monthlyValue) || Number(item.dealValue) || 15000,
          estHours: Number(item.estHours) || 40,
          actualHours: Number(item.actualHours) || 0,
          retainerHours: Number(item.estHours) || 40,
          usedHours: Number(item.actualHours) || 0,
          progressPercent: Number(item.progressPercent) || 0,
          notes: item.notes || "Bulk imported record",
        });
      });

      if (validDocs.length === 0) {
        return NextResponse.json({ error: "No valid client records provided for bulk import", errors }, { status: 400 });
      }

      const insertedClients = await Client.insertMany(validDocs);
      return NextResponse.json({
        success: true,
        count: insertedClients.length,
        message: `Successfully bulk imported ${insertedClients.length} client records!`,
        clients: insertedClients,
        errors: errors.length > 0 ? errors : undefined,
      }, { status: 201 });
    }

    // ── Handle Single Client Creation ───────────────────────────────────────
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
      monthlyValue,
      estHours,
      actualHours,
      progressPercent,
      notes,
    } = body;

    if (!clientAccount || !projectName) {
      return NextResponse.json({ error: "Client account and project name are required" }, { status: 400 });
    }

    const newClient = await Client.create({
      tenantId: tenantObjectId,
      uploadedBy: userObjectId,
      name: clientAccount,
      company: clientAccount,
      clientAccount,
      projectId: projectId || `CLP-${Date.now().toString().slice(-4)}`,
      venture: venture || "Ace Consultancys",
      projectName,
      deliveryOwner: deliveryOwner || session.userName,
      phase: phase || "In Delivery",
      priority: priority || "Medium",
      startDate: startDate ? new Date(startDate) : new Date(),
      targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
      health: health || "Green",
      billingType: billingType || "Retainer",
      monthlyValue: Number(monthlyValue) || 15000,
      estHours: Number(estHours) || 40,
      actualHours: Number(actualHours) || 0,
      retainerHours: Number(estHours) || 40,
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
