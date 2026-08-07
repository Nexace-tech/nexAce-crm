import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * GET: Fetch all client retainers for the authenticated tenant.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId, session } = authResult;
    await connectToDatabase();

    const isElevatedRole = session.role === "Admin";
    const queryCondition: any = { tenantId: tenantObjectId };

    if (!isElevatedRole) {
      const escapedName = session.userName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
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
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
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

    // Fallbacks and mappings for backwards compatibility
    const finalProjectId = projectId || "CLP-001";
    const finalClientAccount = clientAccount || body.company || body.name || "Default Client";
    const finalVenture = venture || "Ace Consultancys";
    const finalProjectName = projectName || "Monthly Retainer";
    const finalDeliveryOwner = deliveryOwner || "Barkha";
    const finalStartDate = startDate ? new Date(startDate) : new Date();
    const finalTargetEndDate = targetEndDate ? new Date(targetEndDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    if (!finalClientAccount || !finalProjectName || !finalDeliveryOwner) {
      return NextResponse.json(
        { error: "Client/Account, Project Name, and Delivery Owner are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newClient = await Client.create({
      projectId: finalProjectId,
      clientAccount: finalClientAccount,
      venture: finalVenture,
      projectName: finalProjectName,
      deliveryOwner: finalDeliveryOwner,
      phase: phase || "In Delivery",
      priority: priority || "Medium",
      startDate: finalStartDate,
      targetEndDate: finalTargetEndDate,
      health: health || "Green",
      billingType: billingType || "Retainer",
      estHours: Number(estHours) || 0,
      actualHours: Number(actualHours) || 0,
      progressPercent: Number(progressPercent) || 0,
      notes: notes || "",
      tenantId: tenantObjectId,
      uploadedBy: userObjectId,

      // old fields fallback
      name: finalClientAccount,
      company: finalClientAccount,
      email: body.email || `${finalClientAccount.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: body.phone || "",
      status: phase === "On Hold" ? "On Hold" : phase?.startsWith("Closed") ? "Archived" : "Active",
      pipelineStage: phase === "In Delivery" ? "Active Retainer" : "Closed",
      retainerHours: Number(estHours) || 0,
      usedHours: Number(actualHours) || 0,
      monthlyValue: body.monthlyValue || 1500,
    });

    return NextResponse.json({ client: newClient, message: "Project created successfully" }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Client error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
