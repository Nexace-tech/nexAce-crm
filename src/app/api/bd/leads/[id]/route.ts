import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;
    const { id } = await params;

    const body = await request.json();
    await connectToDatabase();

    const existingLead = await Lead.findOne({ _id: id, tenantId: tenantObjectId });
    if (!existingLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const isStatusChanged = body.status !== undefined && body.status !== existingLead.status;
    const isStageChanged = body.stage !== undefined && body.stage !== existingLead.stage;

    const updateOps: Record<string, unknown> = { $set: body };

    if (isStatusChanged || isStageChanged) {
      const historyEntry = {
        fromStatus: existingLead.status,
        toStatus: body.status || existingLead.status,
        fromStage: existingLead.stage,
        toStage: body.stage || existingLead.stage,
        changedBy: userObjectId,
        changedByName: session.userName || "Admin",
        notes: body.notes || (isStatusChanged ? `Status updated to ${body.status}` : `Stage updated to ${body.stage}`),
        timestamp: new Date(),
      };
      updateOps.$push = { history: historyEntry };
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      updateOps,
      { new: true }
    );

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (isStatusChanged || isStageChanged) {
      await ActivityLog.create({
        tenantId: tenantObjectId,
        userId: userObjectId,
        userName: session.userName || "Admin",
        userRole: session.role,
        action: isStatusChanged ? "LEAD_STATUS_CHANGED" : "LEAD_STAGE_CHANGED",
        targetName: lead.leadName,
        details: isStatusChanged
          ? `Lead "${lead.leadName}" status changed from "${existingLead.status}" to "${body.status}"`
          : `Lead "${lead.leadName}" stage changed from "${existingLead.stage}" to "${body.stage}"`,
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    const { id } = await params;

    await connectToDatabase();
    const lead = await Lead.findOneAndDelete({ _id: id, tenantId: tenantObjectId });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
