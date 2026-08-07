import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { OneOnOneMeeting } from "@/models/OneOnOneMeeting";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET: Fetch 1:1 meetings for current session user (as Manager or Employee)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const userIdObj = new mongoose.Types.ObjectId(session.userId);
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    // Fetch meetings where user is either manager or employee
    let meetings = await OneOnOneMeeting.find({
      tenantId: tenantIdObj,
      $or: [{ managerId: userIdObj }, { employeeId: userIdObj }],
    }).sort({ scheduledDate: -1 });

    // Seed default sample 1:1 meeting if empty
    if (meetings.length === 0) {
      // Find a colleague in tenant
      const colleague = await User.findOne({
        tenantId: tenantIdObj,
        _id: { $ne: userIdObj },
      });

      const otherUserId = colleague ? colleague._id : userIdObj;
      const otherUserName = colleague ? colleague.name : "Teammate";

      const isManagerRole = session.role === "Admin" || session.role === "Manager";

      const sampleMeeting = await OneOnOneMeeting.create({
        managerId: isManagerRole ? userIdObj : otherUserId,
        managerName: isManagerRole ? session.userName : otherUserName,
        employeeId: isManagerRole ? otherUserId : userIdObj,
        employeeName: isManagerRole ? otherUserName : session.userName,
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        status: "Scheduled",
        agenda: "1. Review sprint goals and roadblock issues\n2. Career growth & feedback\n3. Q3 project priorities",
        notes: "Initial alignment call booked.",
        actionItems: [
          { text: "Update OKR progress for Q3 key results", completed: false, carriedOver: false },
          { text: "Review client retainer allocation report", completed: true, carriedOver: false },
        ],
        tenantId: tenantIdObj,
      });

      meetings = [sampleMeeting];
    }

    return NextResponse.json({ meetings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET 1:1 meetings error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Schedule a new 1:1 meeting
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, scheduledDate, agenda, actionItems } = body;

    if (!employeeId || !scheduledDate) {
      return NextResponse.json({ error: "Teammate selection and meeting date are required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const employeeUser = await User.findOne({ _id: employeeId, tenantId: tenantIdObj });
    if (!employeeUser) {
      return NextResponse.json({ error: "Selected employee not found in workspace" }, { status: 404 });
    }

    const meeting = await OneOnOneMeeting.create({
      managerId: new mongoose.Types.ObjectId(session.userId),
      managerName: session.userName,
      employeeId: new mongoose.Types.ObjectId(employeeId),
      employeeName: employeeUser.name,
      scheduledDate: new Date(scheduledDate),
      status: "Scheduled",
      agenda: agenda || "1. Progress review & roadblocks\n2. Action item updates",
      actionItems: actionItems || [],
      tenantId: tenantIdObj,
    });

    return NextResponse.json({ success: true, meeting }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST 1:1 meeting error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update meeting notes, toggle action items, or complete 1:1 session
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { meetingId, notes, status, actionItems } = body;

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const meeting = await OneOnOneMeeting.findOne({
      _id: meetingId,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting record not found" }, { status: 404 });
    }

    const isManager = meeting.managerId.toString() === userObjectId.toString();
    const isEmployee = meeting.employeeId.toString() === userObjectId.toString();
    const isAdmin = session.role === "Admin" || session.role === "Manager";

    if (!isManager && !isEmployee && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: you are not a participant in this meeting" }, { status: 403 });
    }

    if (notes !== undefined) meeting.notes = notes;
    if (status !== undefined) meeting.status = status;
    if (actionItems !== undefined) meeting.actionItems = actionItems;

    await meeting.save();

    return NextResponse.json({ success: true, meeting });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT 1:1 meeting error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
