import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { ActivityLog } from "@/models/ActivityLog";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
import { notify, notifyAdmins } from "@/lib/notify";
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
    const assigneeId = searchParams.get("assignee");

    await connectToDatabase();
    const dataScope = await getUserDataScope(session);
    const userObjId = new mongoose.Types.ObjectId(session.userId);

    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (projectId && projectId !== "all") {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }

    if (sprintId) {
      query.sprintId = new mongoose.Types.ObjectId(sprintId);
    }

    if (assigneeId) {
      query.assignee = new mongoose.Types.ObjectId(assigneeId);
    }

    // Role-based task scoping
    if (dataScope.scope === "own") {
      // Find projects where the user is an assigned member
      const userProjects = await Project.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        $or: [
          { members: userObjId },
          { createdBy: userObjId },
        ],
      }).select("_id");
      const userProjectIds = userProjects.map((p) => p._id);

      const taskScopeCondition = {
        $or: [
          { assignee: userObjId },
          { projectId: { $in: userProjectIds } },
        ]
      };

      if (query.projectId) {
        // If specific project selected, ensure user has access or task assigned
        query.$and = [
          { projectId: query.projectId },
          taskScopeCondition,
        ];
        delete query.projectId;
      } else {
        query.$and = [taskScopeCondition];
      }
    } else if (dataScope.scope === "department") {
      const loggedUser = await User.findById(session.userId).lean();
      const userDept = loggedUser?.department;
      const assignedTasks = await Task.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        assignee: userObjId,
      }).select("projectId").lean();
      const assignedProjectIds = assignedTasks.map((t: any) => t.projectId).filter(Boolean);

      const deptProjects = await Project.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        $or: [
          { members: userObjId },
          { createdBy: userObjId },
          { assignedDepartment: userDept },
          { _id: { $in: assignedProjectIds } },
        ],
      }).select("_id");
      const deptProjectIds = deptProjects.map((p) => p._id);

      const deptScopeCondition = {
        $or: [
          { assignee: userObjId },
          { projectId: { $in: deptProjectIds } },
        ]
      };

      if (query.projectId) {
        query.$and = [
          { projectId: query.projectId },
          deptScopeCondition,
        ];
        delete query.projectId;
      } else {
        query.$and = [deptScopeCondition];
      }
    }

    const tasks = await Task.find(query)
      .populate("assignee", "name role photoUrl")
      .populate("projectId", "name")
      .sort({ createdAt: 1 });

    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Tasks error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
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

    // Authorization: non-privileged users must be a member of the target project
    if (session.role !== "Admin" && session.role !== "Manager") {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
      }
      const userObjId = new mongoose.Types.ObjectId(session.userId);
      const project = await Project.findOne({
        _id: new mongoose.Types.ObjectId(projectId),
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        $or: [{ members: userObjId }, { createdBy: userObjId }],
      });
      if (!project) {
        return NextResponse.json({ error: "Forbidden: you are not a member of this project" }, { status: 403 });
      }
    }

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

    // Real-time Notification for Assignee
    if (assignee) {
      await notify(session.tenantId, assignee, {
        title: "New Task Assigned",
        message: `${session.userName} assigned you task: '${title}'`,
        type: "task",
        linkUrl: "/dashboard/hr?tab=tasks",
      });
    }

    // Notify Admins of task creation
    await notifyAdmins(session.tenantId, {
      title: "Task Created",
      message: `${session.userName} created task: '${title}' (${status || "To Do"})`,
      type: "task",
      linkUrl: "/dashboard/hr?tab=tasks",
    });

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Tasks error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
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

    const tenantObjId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjId = new mongoose.Types.ObjectId(session.userId);
    const isPrivileged = session.role === "Admin" || session.role === "Manager";

    if (!isPrivileged) {
      const isAssignee = task.assignee && task.assignee.toString() === session.userId;
      const isMember = task.projectId
        ? await Project.exists({
            _id: task.projectId,
            tenantId: tenantObjId,
            $or: [{ members: userObjId }, { createdBy: userObjId }],
          })
        : false;
      if (!isAssignee && !isMember) {
        return NextResponse.json({ error: "Forbidden: you do not have access to this task" }, { status: 403 });
      }
      // Non-privileged users cannot reassign a task to a different user
      if (assignee !== undefined && assignee !== null && assignee !== session.userId) {
        return NextResponse.json({ error: "Forbidden: you can only reassign tasks to yourself" }, { status: 403 });
      }
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
      // Notify the newly assigned user
      if (assignee) {
        await notify(session.tenantId, assignee, {
          title: "Task Assigned to You",
          message: `${session.userName} assigned you task: '${task.title}'`,
          type: "task",
          linkUrl: "/dashboard/projects",
        });
      }
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

    // Notify the task assignee if updated by someone else (e.g., Admin or Manager)
    const taskAssigneeId = task.assignee ? task.assignee.toString() : null;
    if (taskAssigneeId && taskAssigneeId !== session.userId) {
      const isStatusChange = status !== undefined && status !== oldStatus;
      const isPriorityChange = priority !== undefined && priority !== oldPriority;
      
      let notifTitle = "Task Updated";
      let notifMessage = `${session.userName} updated task: '${task.title}'`;

      if (isStatusChange) {
        notifTitle = "Task Status Updated";
        notifMessage = `${session.userName} changed status of your task '${task.title}' to '${status}'`;
      } else if (isPriorityChange) {
        notifTitle = "Task Priority Changed";
        notifMessage = `${session.userName} updated priority of your task '${task.title}' to '${priority}'`;
      } else if (commentText) {
        notifTitle = "New Comment on Your Task";
        notifMessage = `${session.userName} commented on '${task.title}': "${commentText.length > 60 ? commentText.substring(0, 60) + "..." : commentText}"`;
      }

      await notify(session.tenantId, taskAssigneeId, {
        title: notifTitle,
        message: notifMessage,
        type: "task",
        linkUrl: "/dashboard/hr?tab=tasks",
      });
    }

    // Always Notify Admins whenever a task is updated by any user
    const updateSummary = status
      ? `changed status to '${status}'`
      : priority
      ? `changed priority to '${priority}'`
      : commentText
      ? `commented on task`
      : `updated task details`;

    await notifyAdmins(
      session.tenantId,
      {
        title: "Task Updated",
        message: `${session.userName} ${updateSummary} for task: '${task.title}'`,
        type: "task",
        linkUrl: "/dashboard/hr?tab=tasks",
      },
      ["Admin"],
      session.userId
    );

    // Populate assignee details before returning
    const updatedTask = await Task.findById(taskId).populate("assignee", "name role photoUrl");

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Tasks error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
  }
}

export const PATCH = PUT;

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

    // Authorization: only privileged roles may delete tasks
    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    await connectToDatabase();

    const task = await Task.findById(taskId);
    if (!task || task.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await task.deleteOne();

    // Notify Admins on task deletion
    await notifyAdmins(session.tenantId, {
      title: "Task Deleted",
      message: `${session.userName} deleted task: '${task.title}'`,
      type: "task",
      linkUrl: "/dashboard/hr?tab=tasks",
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Tasks error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
  }
}

