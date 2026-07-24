import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { ActivityLog } from "@/models/ActivityLog";
import mongoose from "mongoose";

/**
 * PUT: Edit project details (Admin/Manager or Project Member).
 */
export async function PUT(
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

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project || project.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
    const isMember = project.members.some((m) => m.toString() === session.userId);

    if (!isManagerOrAdmin && !isMember) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status, members } = body;

    const oldStatus = project.status;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status && ["Planning", "In Progress", "On Hold", "Completed"].includes(status)) {
      project.status = status;
    }
    if (members && Array.isArray(members)) {
      project.members = members.map((m: string) => new mongoose.Types.ObjectId(m));
    }

    await project.save();

    if (status && status !== oldStatus) {
      await ActivityLog.create({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectId: project._id,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "PROJECT_STATUS_CHANGED",
        targetName: project.name,
        details: `Updated project '${project.name}' status from '${oldStatus}' to '${status}'`,
      });
    }

    const updatedProject = await Project.findById(id).populate("members", "name role photoUrl");

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    console.error("API PUT Project error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Delete a project and its associated tasks (Admin/Manager).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Project ID" }, { status: 400 });
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project || project.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete associated tasks
    await Task.deleteMany({ projectId: new mongoose.Types.ObjectId(id) });

    // Delete project
    await project.deleteOne();

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE Project error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
