import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch timesheet entries.
 * - If ?pending=true: returns all pending entries for direct reports (Manager view).
 * - Otherwise: returns logged-in user's entries in the selected date range (?start=...&end=...).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pending = searchParams.get("pending") === "true";
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    await connectToDatabase();

    if (pending) {
      // Role permission check: Manager or Admin
      const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
      if (!isManagerOrAdmin) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }

      // Find users who report to this manager
      const reports = await User.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        managerId: new mongoose.Types.ObjectId(session.userId),
      }).select("_id");
      
      const reportIds = reports.map((r) => r._id);

      // Find pending timesheet entries for reports
      const pendingEntries = await TimeEntry.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        userId: { $in: reportIds },
        status: "Pending",
      })
        .populate("userId", "name role department photoUrl")
        .sort({ date: 1 });

      return NextResponse.json({ entries: pendingEntries });
    }

    // Normal view: Fetch logged-in user's timesheet entries in date range
    if (!startStr || !endStr) {
      return NextResponse.json({ error: "Start and end dates are required parameters" }, { status: 400 });
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const userEntries = await TimeEntry.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      userId: new mongoose.Types.ObjectId(session.userId),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    return NextResponse.json({ entries: userEntries });
  } catch (error: any) {
    console.error("API GET Timesheets error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Log or submit timesheet entries.
 * Body can be a single entry or a batch array of entries.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    await connectToDatabase();

    if (Array.isArray(body)) {
      // Batch log/submit
      const entriesToCreate = body.map((entry: any) => ({
        userId: new mongoose.Types.ObjectId(session.userId),
        project: entry.project,
        taskName: entry.taskName,
        hours: Number(entry.hours),
        date: new Date(entry.date),
        isBillable: entry.isBillable !== false,
        status: entry.status || "Draft",
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
      }));

      // Basic validation
      for (const e of entriesToCreate) {
        if (!e.project || !e.taskName || isNaN(e.hours) || !e.date) {
          return NextResponse.json({ error: "Invalid timesheet entry payload fields" }, { status: 400 });
        }
      }

      const created = await TimeEntry.insertMany(entriesToCreate);
      return NextResponse.json({ success: true, count: created.length });
    } else {
      // Single entry log/submit
      const { project, taskName, hours, date, isBillable, status } = body;

      if (!project || !taskName || !hours || !date) {
        return NextResponse.json({ error: "Project, taskName, hours, and date are required" }, { status: 400 });
      }

      const newEntry = await TimeEntry.create({
        userId: new mongoose.Types.ObjectId(session.userId),
        project,
        taskName,
        hours: Number(hours),
        date: new Date(date),
        isBillable: isBillable !== false,
        status: status || "Draft",
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
      });

      return NextResponse.json({ success: true, entry: newEntry }, { status: 201 });
    }
  } catch (error: any) {
    console.error("API POST Timesheets error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Approve or reject timesheet submissions (Restricted to Manager/Admin).
 * Body: { entryIds: string[], status: 'Approved' | 'Rejected' }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { entryIds, status } = body;

    if (!entryIds || !Array.isArray(entryIds) || !status) {
      return NextResponse.json({ error: "Entry IDs list and status are required fields" }, { status: 400 });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify and update matching entries belonging to the tenant
    const result = await TimeEntry.updateMany(
      {
        _id: { $in: entryIds.map((id) => new mongoose.Types.ObjectId(id)) },
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
      },
      {
        status,
        approvedBy: new mongoose.Types.ObjectId(session.userId),
      }
    );

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    console.error("API PUT Timesheets error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
