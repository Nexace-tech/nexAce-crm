import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
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

    const dataScope = await getUserDataScope(session);

    if (pending) {
      if (!dataScope.canViewFeature("approveTimesheets") && session.role !== "Admin" && session.role !== "OPS") {
        return NextResponse.json({ error: "Forbidden: Timesheet approval permission required" }, { status: 403 });
      }

      const query: Record<string, unknown> = {
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        status: "Pending",
      };

      if (dataScope.scope === "department") {
        const loggedUser = await User.findById(session.userId).lean();
        const userDept = loggedUser?.department;
        const reports = await User.find({
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
          $or: [
            { managerId: new mongoose.Types.ObjectId(session.userId) },
            { department: userDept },
          ]
        }).select("_id");
        
        const reportIds = reports.map((r) => r._id);
        query.userId = { $in: reportIds };
      } else if (dataScope.scope === "own") {
        query.userId = new mongoose.Types.ObjectId(session.userId);
      }

      const pendingEntries = await TimeEntry.find(query)
        .populate("userId", "name role department photoUrl")
        .sort({ date: 1 });

      return NextResponse.json({ entries: pendingEntries });
    }

    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (dataScope.scope === "department") {
      const loggedUser = await User.findById(session.userId).lean();
      const userDept = loggedUser?.department;
      const reports = await User.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        $or: [
          { managerId: new mongoose.Types.ObjectId(session.userId) },
          { department: userDept },
        ]
      }).select("_id");
      const reportIds = reports.map((r) => r._id);
      query.userId = { $in: reportIds };
    } else if (dataScope.scope === "own") {
      query.userId = new mongoose.Types.ObjectId(session.userId);
    }

    if (startStr && endStr) {
      query.date = { $gte: new Date(startStr), $lte: new Date(endStr) };
    }

    const entries = await TimeEntry.find(query)
      .populate("userId", "name role department photoUrl")
      .sort({ date: -1 });

    return NextResponse.json({ entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Timesheets error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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
      // Validate BEFORE building bulkOps to prevent partial writes of invalid entries
      for (const e of body) {
        if (!e.project || !e.date || isNaN(Number(e.hours)) || Number(e.hours) <= 0) {
          return NextResponse.json({ error: "Each entry requires project, date, and hours > 0" }, { status: 400 });
        }
      }

      // Batch upsert to prevent duplicate entries for the same date/project/task
      const bulkOps: mongoose.mongo.AnyBulkWriteOperation<any>[] = body.map((entry: Record<string, unknown>) => ({
        updateOne: {
          filter: {
            userId: new mongoose.Types.ObjectId(session.userId),
            tenantId: new mongoose.Types.ObjectId(session.tenantId),
            date: new Date(entry.date as string),
            project: entry.project,
            taskName: entry.taskName || "General Tasks",
          },
          update: {
            $set: {
              hours: Number(entry.hours),
              isBillable: entry.isBillable !== false,
              status: (entry.status as "Draft" | "Pending" | "Approved" | "Rejected") || "Draft",
            }
          },
          upsert: true
        }
      }));

      const result = await TimeEntry.bulkWrite(bulkOps as any);
      return NextResponse.json({ success: true, count: result.upsertedCount + result.modifiedCount });
    } else {
      // Single entry log/submit
      const { project, taskName, hours, date, isBillable, status } = body;

      if (!project || !taskName || !hours || !date || Number(hours) <= 0) {
        return NextResponse.json({ error: "Project, taskName, hours (> 0), and date are required" }, { status: 400 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Timesheets error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Timesheets error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
