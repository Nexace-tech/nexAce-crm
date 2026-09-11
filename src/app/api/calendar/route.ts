import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models/Event";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import mongoose from "mongoose";

const VALID_EVENT_TYPES = ["Meeting", "Holiday", "Birthday", "Deadline", "Personal"] as const;
const MAX_EVENT_DURATION_DAYS = 90; // Prevent accidentally-huge events

/**
 * GET: Fetch calendar events for the requesting user.
 *
 * Streams merged from:
 *  1. Explicit Events    — scoped by department; Personal events are owner-only
 *  2. Task Due Dates     — only tasks assigned to (or created by) the user; Done tasks excluded;
 *                          Admin/OPS/Manager see all tasks
 *  3. Work Anniversaries — same-department only for regular users; all for elevated roles
 *
 * Query params:
 *   department  — filter stream 1 & 3 by department (optional)
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const department    = searchParams.get("department") || "";

    await connectToDatabase();

    const isElevated     = ["Admin", "OPS", "Manager"].includes(session.role);
    const now            = new Date();

    // ─────────────────────────────────────────────────────────────
    // 1. Explicit Events — department-scoped, Personal owner-only
    // ─────────────────────────────────────────────────────────────
    const eventQuery: any = { tenantId: tenantObjectId };
    if (department && department !== "All") {
      eventQuery.$or = [
        { department },
        { department: "All" },
        { department: { $exists: false } },
      ];
    }

    const rawEvents = await Event.find(eventQuery)
      .populate("userId", "name role photoUrl department")
      .sort({ startDate: 1 })
      .lean();

    const explicitEvents = rawEvents
      .filter((evt) => {
        // Personal events are only visible to their creator
        if (evt.type === "Personal") {
          return (evt.userId as any)?._id?.toString() === session.userId;
        }
        return true;
      })
      .map((evt) => ({ ...evt, source: "event" }));

    // ─────────────────────────────────────────────────────────────
    // 2. Task Due Dates as Deadline calendar entries
    //    - All tasks with a due date (including Done)
    //    - Admin / OPS / Manager see all tasks (full team view)
    //    - Regular users see only tasks assigned to them
    // ─────────────────────────────────────────────────────────────
    const taskQuery: any = {
      tenantId: tenantObjectId,
      dueDate:  { $exists: true, $ne: null },
    };

    // Scope to the requesting user's assigned tasks only
    if (!isElevated) {
      taskQuery.assignee = userObjectId;
    }

    const tasks = await Task.find(taskQuery)
      .populate("assignee", "name role photoUrl department")
      .lean();

    const taskEvents = tasks
      // Apply department filter to tasks too (when a dept filter is active)
      .filter((task) => {
        if (!department || department === "All") return true;
        const taskDept = (task.assignee as any)?.department;
        return !taskDept || taskDept === department;
      })
      .map((task) => {
        const dueDate  = new Date(task.dueDate!);
        const isOverdue = dueDate < now && task.status !== "Done";
        return {
          _id:         `task_${task._id}`,
          title:       `[Task] ${task.title}`,
          description: [
            task.description,
            `Priority: ${task.priority}`,
            `Status: ${task.status}`,
          ].filter(Boolean).join(" · "),
          type:       "Deadline",
          startDate:  task.dueDate,
          endDate:    task.dueDate,
          department: (task.assignee as any)?.department || "All",
          userId:     task.assignee  || { name: "Unassigned", _id: session.userId },
          priority:   task.priority,  // extra metadata for UI colour-coding
          taskStatus: task.status,    // differentiate In-Progress vs To Do, etc.
          isOverdue,                  // flag past-due tasks so UI can render in red
          isSynced:   true,
          source:     "task",
        };
      });

    // ─────────────────────────────────────────────────────────────
    // 3. Work Anniversaries
    //    - Elevated roles see all; regular users see same-department only
    //    - Only show if the anniversary hasn't already passed this year
    //      (show within a ±30 day window from today so past ones don't clutter)
    // ─────────────────────────────────────────────────────────────
    // Look up the requesting user's department for anniversary scoping
    const requestingUser = await User.findById(userObjectId).select("department").lean();
    const userDept = (requestingUser as any)?.department || "";

    const anniversaryQuery: any = {
      tenantId: tenantObjectId,
      joinDate: { $exists: true, $ne: null },
    };
    // Non-elevated users only see anniversaries within their own department
    if (!isElevated && userDept) {
      anniversaryQuery.department = userDept;
    }
    // Explicit department filter from query params overrides the above
    if (department && department !== "All") {
      anniversaryQuery.department = department;
    }

    const teamMembers = await User.find(anniversaryQuery)
      .select("name department photoUrl joinDate role")
      .lean();

    const currentYear      = now.getFullYear();
    const windowStart      = new Date(now.getTime() - 30 * 86400000); // 30 days ago
    const windowEnd        = new Date(now.getTime() + 180 * 86400000); // 6 months ahead

    const anniversaryEvents = teamMembers
      .map((member) => {
        const originalJoin       = new Date(member.joinDate!);
        const yearsWithTeam      = currentYear - originalJoin.getFullYear();
        if (yearsWithTeam <= 0) return null; // Skip if it's their first year (not an anniversary yet)

        const anniversaryThisYear = new Date(
          currentYear,
          originalJoin.getMonth(),
          originalJoin.getDate()
        );

        // Only include anniversaries within the rolling window
        if (anniversaryThisYear < windowStart || anniversaryThisYear > windowEnd) return null;

        return {
          _id:         `anniv_${member._id}`,
          title:       `✦ ${member.name}'s Work Anniversary`,
          description: `${yearsWithTeam} year${yearsWithTeam !== 1 ? "s" : ""} with the team — celebrate! 🎉`,
          type:        "Birthday",
          startDate:   anniversaryThisYear,
          endDate:     anniversaryThisYear,
          department:  member.department || "All",
          userId:      member,
          isSynced:    true,
          source:      "anniversary",
        };
      })
      .filter(Boolean);

    // ─────────────────────────────────────────────────────────────
    // 4. Merge & sort all streams by startDate ascending
    // ─────────────────────────────────────────────────────────────
    const allEvents = [...explicitEvents, ...taskEvents, ...anniversaryEvents]
      .sort((a, b) => new Date((a as any).startDate).getTime() - new Date((b as any).startDate).getTime());

    return NextResponse.json({
      events: allEvents,
      meta: {
        total:     allEvents.length,
        tasks:     taskEvents.length,
        explicit:  explicitEvents.length,
        anniversaries: anniversaryEvents.length,
        isElevated,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Calendar error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new calendar event.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { session, tenantObjectId, userObjectId } = authResult;

    const body = await request.json();
    const { title, description, type, startDate, endDate, department } = body;

    if (!title?.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: "Title, start date, and end date are required" }, { status: 400 });
    }

    // Validate event type
    if (type && !VALID_EVENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (end.getTime() < start.getTime()) {
      return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });
    }

    // Guard against accidentally huge events
    const durationDays = (end.getTime() - start.getTime()) / 86400000;
    if (durationDays > MAX_EVENT_DURATION_DAYS) {
      return NextResponse.json(
        { error: `Event duration cannot exceed ${MAX_EVENT_DURATION_DAYS} days` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newEvent = await Event.create({
      title:       title.trim(),
      description: description?.trim() || "",
      type:        type || "Meeting",
      startDate:   start,
      endDate:     end,
      department:  department || "All",
      userId:      userObjectId,
      tenantId:    tenantObjectId,
    });

    const populated = await newEvent.populate("userId", "name role photoUrl department");

    return NextResponse.json({ success: true, event: populated }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Calendar error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
