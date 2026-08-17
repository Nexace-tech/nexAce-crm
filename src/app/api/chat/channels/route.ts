import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Channel } from "@/models/Channel";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const DEFAULT_CHANNELS = [
  { name: "general", description: "Company-wide general discussion", isPinned: true },
  { name: "projects", description: "Project updates & sprint announcements", isPinned: true },
  { name: "engineering", description: "Tech stack & code reviews", isPinned: false },
  { name: "random", description: "Watercooler chat & social", isPinned: false },
];

/**
 * GET: Fetch all channels for the current tenant.
 * Seeds defaults if no channels exist.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    await connectToDatabase();

    let channels = await Channel.find({ tenantId: tenantObjectId }).sort({ isPinned: -1, name: 1 });

    // Seed defaults if empty
    if (channels.length === 0) {
      const docs = DEFAULT_CHANNELS.map((ch) => ({
        ...ch,
        createdBy: userObjectId,
        tenantId: tenantObjectId,
      }));
      channels = await Channel.insertMany(docs);
    }

    return NextResponse.json({ channels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Channels error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new channel (Admin & Manager only).
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Only Admins and Managers can create channels." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    await connectToDatabase();

    const existing = await Channel.findOne({ tenantId: tenantObjectId, name: cleanName });
    if (existing) {
      return NextResponse.json({ error: "Channel with this name already exists" }, { status: 400 });
    }

    const newChannel = await Channel.create({
      name: cleanName,
      description: description?.trim() || "",
      isPinned: false,
      createdBy: userObjectId,
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ channel: newChannel }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Channel error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Pin/Unpin or Reactivate a channel (Admin & Manager only).
 * Body: { channelId: string, isPinned?: boolean, isActive?: boolean }
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId } = authResult;

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Only Admins and Managers can modify channels." }, { status: 403 });
    }

    const body = await request.json();
    const { channelId, isPinned, isActive } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updateFields: any = {};
    if (typeof isPinned === "boolean") updateFields.isPinned = isPinned;
    if (typeof isActive === "boolean") updateFields.isActive = isActive;

    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, tenantId: tenantObjectId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Channel error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Move channel to inactive status (soft delete, Admin & Manager only).
 * Query: ?id=channelId
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId } = authResult;

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Only Admins and Managers can deactivate channels." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("id");

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const channel = await Channel.findOne({ _id: channelId, tenantId: tenantObjectId });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.name === "general") {
      return NextResponse.json({ error: "The default #general channel cannot be removed." }, { status: 400 });
    }

    if (channel.isActive !== false) {
      // Step 1: Move to inactive state
      channel.isActive = false;
      await channel.save();
      return NextResponse.json({ success: true, isPermanent: false, message: "Channel moved to inactive list" });
    } else {
      // Step 2: Permanent deletion from DB
      await Channel.deleteOne({ _id: channelId, tenantId: tenantObjectId });
      return NextResponse.json({ success: true, isPermanent: true, message: "Channel permanently deleted" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Channel error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
