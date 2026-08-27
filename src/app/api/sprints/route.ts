import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { getUserDataScope } from "@/lib/dataScope";
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

    const dataScope = await getUserDataScope(session);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const isElevatedSprintUser =
      session.role === "Admin" ||
      session.role === "OPS" ||
      session.role === "Manager" ||
      dataScope.canViewFeature("createSprints") ||
      dataScope.canViewFeature("viewTeamProjects");

    const rawSprints = await Sprint.find({
      tenantId: tenantObjectId,
    }).sort({ startDate: -1 }).lean();

    // Populate burndown stats and linked tasks for each sprint
    const sprintsWithStats = await Promise.all(
      rawSprints.map(async (sprintDoc) => {
        const taskQuery: Record<string, unknown> = {
          tenantId: tenantObjectId,
          sprintId: sprintDoc._id,
        };

        // Employees without sprint management permissions only see their assigned tasks
        if (!isElevatedSprintUser) {
          taskQuery.assignee = userObjectId;
        }

        const linkedTasks = await Task.find(taskQuery)
          .populate("assignee", "name photoUrl role department")
          .lean();

        const totalTasks = linkedTasks.length;
        const completedTasks = linkedTasks.filter((t) => t.status === "Done").length;
        const inProgressTasks = linkedTasks.filter((t) => t.status === "In Progress" || t.status === "Review").length;
        const todoTasks = linkedTasks.filter((t) => t.status === "To Do").length;

        const burndownProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...sprintDoc,
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          burndownProgress,
          linkedTasks,
        };
      })
    );

    // If user is not elevated, strictly show sprints that have tasks assigned to them
    let visibleSprints = sprintsWithStats;
    if (!isElevatedSprintUser) {
      visibleSprints = sprintsWithStats.filter(
        (s) => s.totalTasks > 0
      );
    }

    return NextResponse.json({ sprints: visibleSprints });
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

    const dataScope = await getUserDataScope(session);
    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    const canCreate = isAdmin || session.role === "Manager" || dataScope.canViewFeature("createSprints");

    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: Access denied to create sprints" }, { status: 403 });
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

    const dataScope = await getUserDataScope(session);
    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    const canManage = isAdmin || session.role === "Manager" || dataScope.canViewFeature("completeSprints") || dataScope.canViewFeature("createSprints");

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: Access denied to update sprints" }, { status: 403 });
    }

    const body = await request.json();
    const { sprintId, status } = body;

    if (!sprintId || !status) {
      return NextResponse.json({ error: "Sprint ID and target status are required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    const sprint = await Sprint.findOne({ _id: sprintId, tenantId: tenantObjectId });
    if (!sprint) {
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

/**
 * DELETE: Delete a sprint.
 * Query / Body: { sprintId: string }
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    const canDelete = isAdmin || session.role === "Manager" || dataScope.canViewFeature("deleteSprints");

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: Access denied to delete sprints" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprintId");

    if (!sprintId) {
      return NextResponse.json({ error: "Sprint ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // Unlink any tasks linked to this sprint
    await Task.updateMany(
      { tenantId: tenantObjectId, sprintId: new mongoose.Types.ObjectId(sprintId) },
      { $unset: { sprintId: "" } }
    );

    await Sprint.deleteOne({ _id: sprintId, tenantId: tenantObjectId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Sprints error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

