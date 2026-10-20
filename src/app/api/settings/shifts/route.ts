import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import mongoose from "mongoose";

const DEFAULT_SHIFTS = [
  { id: "s1", name: "Standard Day Shift", startTime: "09:00 AM", endTime: "05:00 PM", description: "Standard 8-hour day shift" },
  { id: "s2", name: "Morning Shift", startTime: "07:00 AM", endTime: "03:00 PM", description: "Early morning operational shift" },
  { id: "s3", name: "Evening Shift", startTime: "03:00 PM", endTime: "11:00 PM", description: "Afternoon to late evening shift" },
  { id: "s4", name: "Night Shift", startTime: "11:00 PM", endTime: "07:00 AM", description: "Overnight operational shift" },
  { id: "s5", name: "Flexible / Weekend Support", startTime: "10:00 AM", endTime: "06:00 PM", description: "Flexible support hours" },
];

const DEFAULT_EMPLOYMENT_TYPES = ["Permanent", "Freelancer", "Part-Time", "Contractor", "Intern"];

/**
 * GET: Fetch tenant custom shifts & employment types
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenant = await Tenant.findById(session.tenantId).lean();

    const shifts = (tenant?.customShifts && tenant.customShifts.length > 0)
      ? tenant.customShifts
      : DEFAULT_SHIFTS;

    const employmentTypes = (tenant?.employmentTypes && tenant.employmentTypes.length > 0)
      ? tenant.employmentTypes
      : DEFAULT_EMPLOYMENT_TYPES;

    const maxShiftHours = tenant?.maxShiftHours ?? 10;
    const targetShiftHours = tenant?.targetShiftHours ?? 8;

    return NextResponse.json({ shifts, employmentTypes, maxShiftHours, targetShiftHours });
  } catch (error: unknown) {
    console.error("GET Shifts API Error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Internal Error" }, { status: 500 });
  }
}

/**
 * POST: Create or Update Tenant Custom Shifts & Employment Types (Admin Only)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "OPS") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { shifts, employmentTypes, updateUserId, newShiftName, newShiftTime, newEmploymentType, maxShiftHours, targetShiftHours } = body;

    await connectToDatabase();
    const tenant = await Tenant.findById(session.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 1. If updating an individual user's shift / employment type / salary
    if (updateUserId) {
      const { salary } = body;
      const updateData: any = {};
      if (newShiftName) updateData.shiftName = newShiftName;
      if (newShiftTime) updateData.shiftTime = newShiftTime;
      if (newEmploymentType) updateData.employmentType = newEmploymentType;
      if (salary !== undefined) {
        updateData.salary = salary === "" ? 0 : Number(salary) || 0;
      }

      await User.updateOne(
        { _id: new mongoose.Types.ObjectId(updateUserId), tenantId: new mongoose.Types.ObjectId(session.tenantId) },
        { $set: updateData }
      );

      return NextResponse.json({ success: true, message: "User shift & status updated successfully" });
    }

    // 2. Otherwise updating workspace shifts / employment types list
    if (Array.isArray(shifts)) {
      tenant.customShifts = shifts;
    }
    if (Array.isArray(employmentTypes)) {
      tenant.employmentTypes = employmentTypes;
    }
    if (maxShiftHours !== undefined) {
      const parsedMax = Number(maxShiftHours);
      if (!isNaN(parsedMax) && parsedMax > 0 && parsedMax <= 24) {
        tenant.maxShiftHours = parsedMax;
      }
    }
    if (targetShiftHours !== undefined) {
      const parsedTarget = Number(targetShiftHours);
      if (!isNaN(parsedTarget) && parsedTarget > 0 && parsedTarget <= 24) {
        tenant.targetShiftHours = parsedTarget;
      }
    }

    await tenant.save();

    return NextResponse.json({
      success: true,
      shifts: tenant.customShifts,
      employmentTypes: tenant.employmentTypes,
      maxShiftHours: tenant.maxShiftHours ?? 10,
      targetShiftHours: tenant.targetShiftHours ?? 8,
      message: "Workspace shifts and shift rules updated"
    });
  } catch (error: unknown) {
    console.error("POST Shifts API Error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Internal Error" }, { status: 500 });
  }
}
