import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
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

    // Populate assignee details before returning
    const updatedTask = await Task.findById(taskId).populate("assignee", "name role photoUrl");

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error("API PUT Tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
