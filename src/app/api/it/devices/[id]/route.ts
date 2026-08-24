import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDevice } from "@/models/ITDevice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    await connectToDatabase();

    const { deviceType, brand, model, serialNumber, assetTag, assignedTo, assignedToName, assignedToEmail, assignedDate, status, condition, purchaseDate, purchaseCost, warrantyExpiry, notes, specs } = body;
    
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (deviceType !== undefined) updatePayload.deviceType = deviceType;
    if (brand !== undefined) updatePayload.brand = brand;
    if (model !== undefined) updatePayload.model = model;
    if (serialNumber !== undefined) updatePayload.serialNumber = serialNumber;
    if (assetTag !== undefined) updatePayload.assetTag = assetTag;
    if (assignedTo !== undefined) updatePayload.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : null;
    if (assignedToName !== undefined) updatePayload.assignedToName = assignedToName;
    if (assignedToEmail !== undefined) updatePayload.assignedToEmail = assignedToEmail;
    if (assignedDate !== undefined) updatePayload.assignedDate = assignedDate ? new Date(assignedDate) : null;
    if (status !== undefined) updatePayload.status = status;
    if (condition !== undefined) updatePayload.condition = condition;
    if (purchaseDate !== undefined) updatePayload.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (purchaseCost !== undefined) updatePayload.purchaseCost = Number(purchaseCost);
    if (warrantyExpiry !== undefined) updatePayload.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
    if (notes !== undefined) updatePayload.notes = notes;
    if (specs !== undefined) updatePayload.specs = specs;

    const updated = await ITDevice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_UPDATED",
      targetName: updated.assetTag,
      details: `Updated device ${updated.assetTag} — status: ${updated.status}, condition: ${updated.condition}`,
    });

    return NextResponse.json({ device: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/it/devices/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await ITDevice.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_DELETED",
      targetName: deleted.assetTag,
      details: `Removed device ${deleted.assetTag} from inventory`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/devices/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
