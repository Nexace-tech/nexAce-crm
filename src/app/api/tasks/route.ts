import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { ActivityLog } from "@/models/ActivityLog";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch tasks filterable by projectId and/or sprintId.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const sprintId = searchParams.get("sprintId");

    await connectToDatabase();

    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }
    if (sprintId) {
      query.sprintId = new mongoose.Types.ObjectId(sprintId);
    }

    const tasks = await Task.find(query)
      .populate("assignee", "name role photoUrl")
      .populate("projectId", "name")
      .sort({ createdAt: 1 });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error("API GET Tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new task.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, projectId, sprintId, assignee, dueDate, priority, status } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "Task title and project link are required" }, { status: 400 });
    }

    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        return NextResponse.json({ error: "Due date cannot be in the past" }, { status: 400 });
      }
    }

    await connectToDatabase();

    const newTask = await Task.create({
      title,
      description: description || "",
      projectId: new mongoose.Types.ObjectId(projectId),
      sprintId: sprintId ? new mongoose.Types.ObjectId(sprintId) : undefined,
      assignee: assignee ? new mongoose.Types.ObjectId(assignee) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || "Medium",
      status: status || "To Do",
      subtasks: [],
      comments: [],
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    // Record Activity Log
    await ActivityLog.create({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(session.userId),
      userName: session.userName,
      userRole: session.role,
      action: "TASK_CREATED",
      targetName: title,
      details: `Created new task '${title}' in status '${status || "To Do"}'`,
    });

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update an existing task status or details (like assigning, adding comment, updating subtask).
 * Body: { taskId: string, status?: string, ...any other fields }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, status, assignee, priority, description, title, dueDate, subtasks, commentText } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(taskId);
    if (!task || task.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const oldStatus = task.status;
    const oldPriority = task.priority;
    const oldAssignee = task.assignee ? task.assignee.toString() : null;

    // Apply updates
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (description !== undefined) task.description = description;
    if (title !== undefined) task.title = title;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (assignee !== undefined) {
      task.assignee = assignee ? new mongoose.Types.ObjectId(assignee) : undefined;
    }
    if (subtasks !== undefined) task.subtasks = subtasks;

    // Handle adding comments
    if (commentText) {
      task.comments.push({
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        content: commentText,
        createdAt: new Date(),
      });
    }

    await task.save();

    // Log Activity Entries in DB
    if (status !== undefined && status !== oldStatus) {
      await ActivityLog.create({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectId: task.projectId,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "STATUS_MOVED",
        targetName: task.title,
        details: `Moved task '${task.title}' status from '${oldStatus}' to '${status}'`,
      });
    }

    if (assignee !== undefined && assignee !== oldAssignee) {
      let assigneeName = "Unassigned";
      if (assignee) {
        const targetUser = await User.findById(assignee);
        if (targetUser) assigneeName = targetUser.name;
      }
      await ActivityLog.create({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectId: task.projectId,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "TASK_ASSIGNED",
        targetName: task.title,
        details: `Assigned task '${task.title}' to ${assigneeName}`,
      });
    }

    if (priority !== undefined && priority !== oldPriority) {
      await ActivityLog.create({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectId: task.projectId,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "PRIORITY_CHANGED",
        targetName: task.title,
        details: `Updated task '${task.title}' priority from '${oldPriority}' to '${priority}'`,
      });
    }

    if (commentText) {
      await ActivityLog.create({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectId: task.projectId,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "COMMENT_ADDED",
        targetName: task.title,
        details: `Commented on task '${task.title}': "${commentText.length > 50 ? commentText.substring(0, 50) + "..." : commentText}"`,
      });
    }

    await task.save();

    // Populate assignee details before returning
    const updatedTask = await Task.findById(taskId).populate("assignee", "name role photoUrl");

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("API PUT Tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Delete a task.
 * URL: /api/tasks?taskId=xxx
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(taskId);
    if (!task || task.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await task.deleteOne();

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE Tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

