import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Client } from "@/models/Client";
import { TimeEntry } from "@/models/TimeEntry";
import { ChatMessage } from "@/models/ChatMessage";
import { OKR } from "@/models/OKR";
import { ActivityLog } from "@/models/ActivityLog";
import { Event as CalendarEvent } from "@/models/Event";
import { Notification } from "@/models/Notification";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // Parallel optimized lean() queries in a single DB round-trip
    const [projects, clients, timesheets, chatMessages, okrs, logs, calendarEvents, notifications] = await Promise.all([
      Project.find({ tenantId: tenantObjectId }).select("name description status priority startDate endDate").sort({ createdAt: -1 }).limit(10).lean(),
      Client.find({ tenantId: tenantObjectId }).select("companyName name email retainerValue status").lean(),
      TimeEntry.find({ tenantId: tenantObjectId }).select("date hours description status").sort({ date: -1 }).limit(10).lean(),
      ChatMessage.find({ tenantId: tenantObjectId, channel: "general" }).select("senderName text createdAt").sort({ createdAt: -1 }).limit(20).lean(),
      OKR.find({ tenantId: tenantObjectId }).select("title description progress category targetDate").sort({ createdAt: -1 }).lean(),
      ActivityLog.find({ tenantId: tenantObjectId }).select("userName action details createdAt").sort({ createdAt: -1 }).limit(15).lean(),
      CalendarEvent.find({ tenantId: tenantObjectId }).select("title start end category type").sort({ start: 1 }).limit(20).lean(),
      Notification.find({ userId: session.userId }).select("title message type read createdAt").sort({ createdAt: -1 }).limit(15).lean(),
    ]);

    return NextResponse.json(
      {
        projects,
        clients,
        timesheets,
        chatMessages,
        okrs,
        logs,
        calendarEvents,
        notifications,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Dashboard summary API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
