import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models/Event";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch calendar events.
 * Filterable by ?department=...
 * Merges explicit Events, Task Due Dates (Deadlines), and User Work Anniversaries (Birthdays).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // 1. Base query for explicit Events
    const query: any = { tenantId: tenantObjectId };
    if (department && department !== "All") {
      query.$or = [
        { department: department },
        { department: "All" },
        { department: { $exists: false } },
      ];
    }

    const events = await Event.find(query)
      .populate("userId", "name role photoUrl department")
      .sort({ startDate: 1 });

    // Filter personal events (only owner can view personal items)
    const explicitEvents = events.filter((evt) => {
      if (evt.type === "Personal") {
        return evt.userId?._id?.toString() === session.userId;
      }
      return true;
    }).map((evt) => evt.toObject());

    // 2. Dynamic Task Due Dates as Deadline Events
    const tasks = await Task.find({
      tenantId: tenantObjectId,
      dueDate: { $exists: true, $ne: null },
    }).populate("assignee", "name role photoUrl department");

    const taskEvents = tasks.map((task) => ({
      _id: `task_${task._id}`,
      title: `[Task] ${task.title}`,
      description: task.description || `Priority: ${task.priority} | Status: ${task.status}`,
      type: "Deadline",
      startDate: task.dueDate,
      endDate: task.dueDate,
      department: (task.assignee as any)?.department || "All",
      userId: task.assignee || { name: "Team Task", _id: session.userId },
      isSynced: true,
    }));

    // 3. Team Work Anniversaries / Join Dates as Birthday/Anniversary Events
    const teamMembers = await User.find({
      tenantId: tenantObjectId,
      joinDate: { $exists: true, $ne: null },
    }).select("name department photoUrl joinDate role");

    const currentYear = new Date().getFullYear();
    const anniversaryEvents = teamMembers.map((member) => {
      const originalJoin = new Date(member.joinDate!);
      const anniversaryThisYear = new Date(currentYear, originalJoin.getMonth(), originalJoin.getDate());
      
      return {
        _id: `anniv_${member._id}`,
        title: `✦ ${member.name}'s Work Anniversary`,
        description: `Celebrating ${currentYear - originalJoin.getFullYear()} year(s) with the team!`,
        type: "Birthday",
        startDate: anniversaryThisYear,
        endDate: anniversaryThisYear,
        department: member.department || "All",
        userId: member.toObject(),
        isSynced: true,
      };
    });

    const getTime = (dateVal: any) => (dateVal ? new Date(dateVal).getTime() : 0);

    // Merge and sort all events by startDate
    const allEvents = [...explicitEvents, ...taskEvents, ...anniversaryEvents].sort(
      (a, b) => getTime(a.startDate) - getTime(b.startDate)
    );

    return NextResponse.json({ events: allEvents });
  } catch (error: any) {
    console.error("API GET Calendar error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new calendar event.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, startDate, endDate, department } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "Title, start date, and end date are required" }, { status: 400 });
    }

    await connectToDatabase();

    const newEvent = await Event.create({
      title,
      description: description || "",
      type: type || "Meeting",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      department: department || "All",
      userId: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Calendar error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
