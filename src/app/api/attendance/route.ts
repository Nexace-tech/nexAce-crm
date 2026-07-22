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

/**
 * GET: Get current user's attendance status for today.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const todayDate = getTodayDateNormalized();

    const attendance = await Attendance.findOne({
      userId: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      date: todayDate,
    });

    return NextResponse.json({ attendance });
  } catch (error: any) {
    console.error("API GET Attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Clock in or Clock out.
 * Body: { action: 'in' | 'out' }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !["in", "out"].includes(action)) {
      return NextResponse.json({ error: "Action must be either 'in' or 'out'" }, { status: 400 });
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
          status: "Present",
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
        });
        return NextResponse.json({ success: true, attendance: newRecord }, { status: 201 });
      } catch (mongoError: any) {
        // Handle duplicate key error (already clocked in)
        if (mongoError.code === 11000) {
          return NextResponse.json({ error: "You are already clocked in for today" }, { status: 400 });
        }
        throw mongoError;
      }
    } else {
      // Clock Out: Find today's record and update clockOut
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

      record.clockOut = now;
      await record.save();

      return NextResponse.json({ success: true, attendance: record });
    }
  } catch (error: any) {
    console.error("API POST Attendance error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
