import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRMeeting } from "@/models/HRMeeting";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const DUMMY_ATTENDEE_NAMES = [
  "Sophia Martinez",
  "David Kim",
  "Emma Wilson",
];

const AVATAR_COLORS = [
  "bg-purple-500 text-white",
  "bg-cyan-500 text-white",
  "bg-pink-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-blue-500 text-white",
];

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    // Clean up old dummy candidate meetings
    await HRMeeting.deleteMany({
      tenantId: tenantObjectId,
      name: { $in: DUMMY_ATTENDEE_NAMES },
    });

    let meetings = await HRMeeting.find({ tenantId: tenantObjectId })
      .sort({ date: 1, time: 1 })
      .lean();

    // If no meetings exist yet, seed with real team members
    if (meetings.length === 0) {
      const realUsers = await User.find({ tenantId: tenantObjectId })
        .select("name")
        .limit(4)
        .lean();

      const todayStr = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      const defaultEvents = [
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          title: "Quarterly Performance Sync",
          name: realUsers[1]?.name || "Aditya Singh Yadav",
          date: todayStr,
          time: "10:00 - 11:00",
          type: "Performance Review",
          avatarColor: AVATAR_COLORS[0],
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          title: "Sprint Review & Tech Alignment",
          name: realUsers[9]?.name || "Ashish Sharma",
          date: todayStr,
          time: "11:30 - 12:30",
          type: "Team Sync",
          avatarColor: AVATAR_COLORS[1],
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          title: "Operations & QA Review",
          name: realUsers[2]?.name || "Tasneem",
          date: tomorrow,
          time: "14:00 - 15:00",
          type: "Candidate Interview",
          avatarColor: AVATAR_COLORS[2],
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          title: "HR Policy & Operations Check-in",
          name: realUsers[12]?.name || "Khushi",
          date: tomorrow,
          time: "16:00 - 17:00",
          type: "Performance Review",
          avatarColor: AVATAR_COLORS[3],
        },
      ];

      await HRMeeting.insertMany(defaultEvents);
      meetings = await HRMeeting.find({ tenantId: tenantObjectId })
        .sort({ date: 1, time: 1 })
        .lean();
    }

    return NextResponse.json({ meetings });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/operations/hr-workdesk/schedule error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    const body = await request.json();
    const { title, name, date, time, type, notes } = body;

    if (!title?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Title and Attendee name are required" }, { status: 400 });
    }

    await connectToDatabase();

    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const meeting = await HRMeeting.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      title: title.trim(),
      name: name.trim(),
      date: date || new Date().toISOString().slice(0, 10),
      time: time?.trim() || "10:00 - 11:00",
      type: type || "Team Sync",
      notes: notes?.trim() || "",
      avatarColor: randomColor,
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/operations/hr-workdesk/schedule error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    await HRMeeting.findOneAndDelete({
      _id: id,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/operations/hr-workdesk/schedule error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
