import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { ActivityLog } from "@/models/ActivityLog";
import mongoose from "mongoose";

/**
 * POST: Restore a soft-deleted project from trash within the 30-day retention window.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    const { getUserDataScope } = await import("@/lib/dataScope");
    const dataScope = await getUserDataScope(session);
    const isElevated =
      session.role === "Admin" ||
      session.role === "OPS" ||
      session.role === "Manager" ||
      dataScope.canViewFeature("deleteProjects");

    if (!isElevated) {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can restore projects" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.isDeleted) {
      return NextResponse.json(
        { message: "Project is already active", project },
        { status: 200 }
      );
    }

    // Restore project
    await Project.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
        },
      }
    );

    // Restore associated tasks
    await Task.updateMany(
      { projectId: new mongoose.Types.ObjectId(id) },
      { $set: { isDeleted: false, deletedAt: null } }
    );

    // Record activity log
    await ActivityLog.create({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      projectId: project._id,
      userId: new mongoose.Types.ObjectId(session.userId),
      userName: session.userName,
      userRole: session.role,
      action: "PROJECT_RESTORED",
      targetName: project.name,
      details: `Project '${project.name}' and its tasks were restored from Trash by ${session.userName}.`,
    });

    const restoredProject = await Project.findById(id)
      .populate("members", "name role photoUrl")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Project '${project.name}' restored successfully!`,
      project: restoredProject,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Restore Project error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
