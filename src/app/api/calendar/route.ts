import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Event } from "@/models/Event";
import mongoose from "mongoose";

/**
 * GET: Fetch calendar events.
 * Filterable by ?department=...
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

    // Base query: events belonging to user's tenant
    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    // Filter by department (plus return "All" general events)
    if (department && department !== "All") {
      query.$or = [
        { department: department },
        { department: "All" },
        { department: { $exists: false } },
      ];
    }

    // Load events
    const events = await Event.find(query)
      .populate("userId", "name role photoUrl")
      .sort({ startDate: 1 });

    // Filter personal events: only show personal events belonging to the logged-in user
    const filteredEvents = events.filter((evt) => {
      if (evt.type === "Personal") {
        return evt.userId._id.toString() === session.userId;
      }
      return true;
    });

    return NextResponse.json({ events: filteredEvents });
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
