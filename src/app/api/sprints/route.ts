import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import mongoose from "mongoose";

/**
 * GET: Fetch all sprints with burndown statistics and linked tasks.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    const rawSprints = await Sprint.find({
      tenantId: tenantObjectId,
    }).sort({ startDate: -1 });

    // Populate burndown stats and linked tasks for each sprint
    const sprintsWithStats = await Promise.all(
      rawSprints.map(async (sprintDoc) => {
        const sprint = sprintDoc.toObject();
        const linkedTasks = await Task.find({
          tenantId: tenantObjectId,
          sprintId: sprintDoc._id,
        }).populate("assignee", "name photoUrl role department");

        const totalTasks = linkedTasks.length;
        const completedTasks = linkedTasks.filter((t) => t.status === "Done").length;
        const inProgressTasks = linkedTasks.filter((t) => t.status === "In Progress" || t.status === "Review").length;
        const todoTasks = linkedTasks.filter((t) => t.status === "To Do").length;

        const burndownProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...sprint,
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          burndownProgress,
          linkedTasks,
        };
      })
    );

    return NextResponse.json({ sprints: sprintsWithStats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Sprints error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new sprint.
 */
export async function POST(request: Request) {
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
    const { name, goal, startDate, endDate, status } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, start date, and end date are required" }, { status: 400 });
    }

    await connectToDatabase();

    // If new sprint is active, ensure we deactivate other sprints first
    if (status === "Active") {
      await Sprint.updateMany(
        { tenantId: new mongoose.Types.ObjectId(session.tenantId), status: "Active" },
        { status: "Completed" }
      );
    }

    const newSprint = await Sprint.create({
      name,
      goal: goal || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || "Planned",
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, sprint: newSprint }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Sprints error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update sprint status (e.g. Activate or Complete).
 * Body: { sprintId: string, status: 'Planned' | 'Active' | 'Completed' }
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
    const { sprintId, status } = body;

    if (!sprintId || !status) {
      return NextResponse.json({ error: "Sprint ID and target status are required" }, { status: 400 });
    }

    await connectToDatabase();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint || sprint.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // If activating, complete any other active sprint in this tenant
    if (status === "Active") {
      await Sprint.updateMany(
        { tenantId: new mongoose.Types.ObjectId(session.tenantId), status: "Active" },
        { status: "Completed" }
      );
    }

    sprint.status = status;
    await sprint.save();

    return NextResponse.json({ success: true, sprint });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Sprints error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
