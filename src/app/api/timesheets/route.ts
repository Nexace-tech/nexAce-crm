import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch timesheet entries.
 * - If ?pending=true: returns pending entries (Admins get all tenant pending entries; Managers get direct reports' pending entries).
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

      let query: any = {
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        status: "Pending",
      };

      if (session.role === "Manager") {
        // Find users who report to this manager
        const reports = await User.find({
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
          managerId: new mongoose.Types.ObjectId(session.userId),
        }).select("_id");
        
        const reportIds = reports.map((r) => r._id);
        query.userId = { $in: reportIds };
      }

      // Find pending timesheet entries
      const pendingEntries = await TimeEntry.find(query)
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
      // Batch log/submit with upsert to prevent duplicates
      const bulkOps = body.map((entry: any) => ({
        updateOne: {
          filter: {
            userId: new mongoose.Types.ObjectId(session.userId),
            tenantId: new mongoose.Types.ObjectId(session.tenantId),
            date: new Date(entry.date),
            project: entry.project,
            taskName: entry.taskName || "General Tasks",
          },
          update: {
            $set: {
              hours: Number(entry.hours),
              isBillable: entry.isBillable !== false,
              status: entry.status || "Draft",
            }
          },
          upsert: true
        }
      }));

      // Basic validation
      for (const e of body) {
        if (!e.project || isNaN(Number(e.hours)) || !e.date) {
          return NextResponse.json({ error: "Invalid timesheet entry payload fields" }, { status: 400 });
        }
      }

      const result = await TimeEntry.bulkWrite(bulkOps);
      return NextResponse.json({ success: true, count: result.upsertedCount + result.modifiedCount });
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
 * PUT: Update timesheet submissions.
 * - Bulk submit week: Body { action: 'submit_week', start: string, end: string }
 * - Approve/Reject (Manager/Admin): Body { entryIds: string[], status: 'Approved' | 'Rejected' }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    // 1. Bulk submit week for current user
    if (body.action === "submit_week") {
      const { start, end } = body;
      if (!start || !end) {
        return NextResponse.json({ error: "Start and end dates are required for week submission" }, { status: 400 });
      }

      const result = await TimeEntry.updateMany(
        {
          userId: new mongoose.Types.ObjectId(session.userId),
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
          status: "Draft",
          date: { $gte: new Date(start), $lte: new Date(end) },
        },
        { status: "Pending" }
      );

      return NextResponse.json({ success: true, submittedCount: result.modifiedCount });
    }

    // 2. Manager / Admin Approval & Rejection
    const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { entryIds, status } = body;

    if (!entryIds || !Array.isArray(entryIds) || !status) {
      return NextResponse.json({ error: "Entry IDs list and status are required fields" }, { status: 400 });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

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
