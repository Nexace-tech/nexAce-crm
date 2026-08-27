import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDevice } from "@/models/ITDevice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

const PRIVILEGED = ["Admin", "OPS", "Sub Admin"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // All authenticated users may attempt a PATCH; ownership is verified below
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const isPrivileged = ["Admin", "OPS", "Sub Admin", "Manager", "HR"].includes(session.role);

    // Fetch the existing record first
    const existing = await ITDevice.findOne({ _id: id, tenantId: tenantObjectId }).lean() as any;
    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Non-privileged users may only edit devices assigned to themselves
    if (!isPrivileged) {
      const recordOwner = (existing.assignedTo || "").toLowerCase();
      const requester = (session.userName || "").toLowerCase();
      if (recordOwner !== requester) {
        return NextResponse.json(
          { error: "Forbidden: You can only edit your own devices" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      type,
      brand,
      modelName,
      serialNumber,
      specs,
      purchaseDate,
      warrantyExpiry,
      assignedTo,
      department,
      os,
      lastSeen,
      condition,
      status,
      assetTag,
    } = body;

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (type !== undefined) updatePayload.type = type;
    if (brand !== undefined) updatePayload.brand = brand;
    if (modelName !== undefined) updatePayload.modelName = modelName;
    if (serialNumber !== undefined) updatePayload.serialNumber = serialNumber;
    if (specs !== undefined) updatePayload.specs = specs;
    if (purchaseDate !== undefined) updatePayload.purchaseDate = purchaseDate;
    if (warrantyExpiry !== undefined) updatePayload.warrantyExpiry = warrantyExpiry;
    if (os !== undefined) updatePayload.os = os;
    if (lastSeen !== undefined) updatePayload.lastSeen = lastSeen;
    if (condition !== undefined) updatePayload.condition = condition;
    if (status !== undefined) updatePayload.status = status;
    if (assetTag !== undefined) updatePayload.assetTag = assetTag;

    // Privileged users (Admin, OPS, HR, Manager) can reassign the device
    if (isPrivileged) {
      if (assignedTo !== undefined) updatePayload.assignedTo = assignedTo;
      if (department !== undefined) updatePayload.department = department;
    }

    const updated = await ITDevice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: "after" }
    );

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_UPDATED",
      targetName: updated?.assetTag,
      details: `Updated device ${updated?.assetTag} — condition: ${updated?.condition}, status: ${updated?.status}`,
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
    // All authenticated users may attempt DELETE; ownership is verified below
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const isPrivileged = PRIVILEGED.includes(session.role);

    // Fetch first to verify ownership
    const existing = await ITDevice.findOne({ _id: id, tenantId: tenantObjectId }).lean() as any;
    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (!isPrivileged) {
      const recordOwner = (existing.assignedTo || "").toLowerCase();
      const requester = (session.userName || "").toLowerCase();
      if (recordOwner !== requester) {
        return NextResponse.json(
          { error: "Forbidden: You can only delete your own devices" },
          { status: 403 }
        );
      }
    }

    const deleted = await ITDevice.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_DELETED",
      targetName: deleted?.assetTag,
      details: `Removed device ${deleted?.assetTag} from inventory`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/devices/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
