import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import mongoose from "mongoose";

// Helper to get normalized date (midnight today in local/UTC date representation)
function getTodayDateNormalized(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

const SHIFT_TARGET_HOURS = 8.0;

/**
 * GET: Get current user's attendance status for today, standard shift metadata, and attendance history logs.
 * Supports ?allUsers=true for Admins/Managers to view all employees' attendance logs.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const todayDate = getTodayDateNormalized();

    const todayAttendance = await Attendance.findOne({
      userId: userObjectId,
      tenantId: tenantObjectId,
      date: todayDate,
    });

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const allUsersParam = searchParams.get("allUsers");

    const isElevatedRole = session.role === "Admin" || session.role === "OPS" || session.role === "Manager";

    let historyFilter: any = { tenantId: tenantObjectId };
    if (!isElevatedRole && allUsersParam !== "true") {
      historyFilter.userId = userObjectId;
    }

    let historyQuery = Attendance.find(historyFilter)
      .populate("userId", "name email role department photoUrl shiftName shiftTime employmentType")
      .sort({ date: -1, clockIn: -1 });

    if (limitParam !== "all") {
      historyQuery = historyQuery.limit(limitParam ? parseInt(limitParam) : 50);
    }

    const history = await historyQuery.lean();

    const shiftInfo = {
      shiftName: "Standard Regular Shift",
      startTime: "09:00 AM",
      endTime: "05:00 PM",
      targetHours: SHIFT_TARGET_HOURS,
      location: "Office / Remote Hybrid",
    };

    return NextResponse.json({
      attendance: todayAttendance,
      history,
      shiftInfo,
    });
  } catch (error: any) {
    console.error("API GET Attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Clock in, Clock out, or Resume shift.
 * Body: { action: 'in' | 'out' | 'resume' }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !["in", "out", "resume"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'in', 'out', or 'resume'" }, { status: 400 });
    }

    await connectToDatabase();

    const todayDate = getTodayDateNormalized();
    const now = new Date();

    if (action === "in") {
      // Clock In: Create daily record
      try {
        const newRecord = await Attendance.create({
          userId: new mongoose.Types.ObjectId(session.userId),
          date: todayDate,
          clockIn: now,
          regularHours: 0,
          overtimeHours: 0,
          status: "Present",
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
        });
        return NextResponse.json({ success: true, attendance: newRecord }, { status: 201 });
      } catch (mongoError: any) {
        if (mongoError.code === 11000) {
          return NextResponse.json({ error: "You are already clocked in for today" }, { status: 400 });
        }
        throw mongoError;
      }
    } else if (action === "out") {
      // Clock Out: Find today's record and calculate regular & overtime hours
      const record = await Attendance.findOne({
        userId: new mongoose.Types.ObjectId(session.userId),
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        date: todayDate,
      });

      if (!record) {
        return NextResponse.json({ error: "No clock-in record found for today" }, { status: 400 });
      }

      if (record.clockOut) {
        return NextResponse.json({ error: "You have already clocked out for today" }, { status: 400 });
      }

      const diffMs = now.getTime() - new Date(record.clockIn).getTime();
      const totalHours = diffMs / (1000 * 60 * 60);

      const regular = Math.min(totalHours, SHIFT_TARGET_HOURS);
      const overtime = Math.max(0, totalHours - SHIFT_TARGET_HOURS);

      record.clockOut = now;
      record.regularHours = Number(regular.toFixed(2));
      record.overtimeHours = Number(overtime.toFixed(2));
      await record.save();

      return NextResponse.json({ success: true, attendance: record });
    } else if (action === "resume") {
      // Resume Shift: Find today's record and clear clockOut
      const record = await Attendance.findOne({
        userId: new mongoose.Types.ObjectId(session.userId),
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        date: todayDate,
      });

      if (!record) {
        return NextResponse.json({ error: "No clock-in record found for today" }, { status: 400 });
      }

      if (!record.clockOut) {
        return NextResponse.json({ error: "Your shift is currently active" }, { status: 400 });
      }

      record.clockOut = undefined;
      record.regularHours = 0;
      record.overtimeHours = 0;
      await record.save();

      return NextResponse.json({ success: true, attendance: record, message: "Shift resumed successfully!" });
    }
  } catch (error: any) {
    console.error("API POST Attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
