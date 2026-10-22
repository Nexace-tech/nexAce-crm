import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/models/Holiday";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function canUserManageHolidays(session: any, tenantObjectId: mongoose.Types.ObjectId): Promise<boolean> {
  if (session.role?.toLowerCase() === "admin") return true;
  if (isSubAdminRole(session.role)) return true;

  try {
    const { RolePermission } = await import("@/models/RolePermission");
    const roleKey = isSubAdminRole(session.role) ? "OPS" : session.role;
    const permDoc = await RolePermission.findOne({
      tenantId: tenantObjectId,
      $or: [{ role: session.role }, { role: roleKey }],
    }).lean();

    if (permDoc?.featurePermissions?.manageHolidays !== undefined) {
      return Boolean(permDoc.featurePermissions.manageHolidays);
    }
    if (session.role === "HR") return true;
  } catch (err) {
    console.error("Error checking manageHolidays permission:", err);
  }
  return false;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;
    const { id } = await params;

    const allowed = await canUserManageHolidays(session, tenantObjectId);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied. Insufficient permissions to manage holidays." }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid holiday ID." }, { status: 400 });
    }

    const body = await request.json();
    await connectToDatabase();

    const existingHoliday = await Holiday.findOne({ _id: id, tenantId: tenantObjectId });
    if (!existingHoliday) {
      return NextResponse.json({ error: "Holiday not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = (body.description || "").trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.applicableDepartments !== undefined) updateData.applicableDepartments = body.applicableDepartments;
    if (body.locations !== undefined) updateData.locations = body.locations;
    if (body.isHalfDay !== undefined) updateData.isHalfDay = Boolean(body.isHalfDay);

    if (body.date) {
      const parsedDate = new Date(body.date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
      }
      const normalizedDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
      updateData.date = normalizedDate;
      updateData.year = normalizedDate.getUTCFullYear();
      updateData.month = normalizedDate.getUTCMonth() + 1;
      updateData.dayOfWeek = DAYS_OF_WEEK[normalizedDate.getUTCDay()];
    }

    const updated = await Holiday.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    return NextResponse.json({ success: true, holiday: updated });
  } catch (error: any) {
    console.error("PUT /api/holidays/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;
    const { id } = await params;

    const allowed = await canUserManageHolidays(session, tenantObjectId);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied. Insufficient permissions to manage holidays." }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid holiday ID." }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await Holiday.findOneAndDelete({ _id: id, tenantId: tenantObjectId });
    if (!deleted) {
      return NextResponse.json({ error: "Holiday not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Holiday deleted successfully." });
  } catch (error: any) {
    console.error("DELETE /api/holidays/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
