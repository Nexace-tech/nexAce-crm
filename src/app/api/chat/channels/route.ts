import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Channel } from "@/models/Channel";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { isSubAdminRole } from "@/lib/roles";
import { getUserDataScope } from "@/lib/dataScope";

const DEFAULT_CHANNELS = [
  { name: "general", description: "Company-wide general discussion", isPinned: true, isPrivate: false },
  { name: "projects", description: "Project updates & sprint announcements", isPinned: true, isPrivate: false },
  { name: "engineering", description: "Tech stack & code reviews", isPinned: false, isPrivate: false },
  { name: "random", description: "Watercooler chat & social", isPinned: false, isPrivate: false },
];

/**
 * GET: Fetch all channels for the current tenant.
 * Filters private channels: only accessible to Admins, OPS, channel members, or creators.
 * Seeds defaults if no channels exist.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    await connectToDatabase();

    const isSuperRole = session.role === "Admin" || isSubAdminRole(session.role);

    const query: any = { tenantId: tenantObjectId };
    if (!isSuperRole) {
      query.$or = [
        { isPrivate: { $ne: true } },
        { members: userObjectId },
        { createdBy: userObjectId },
      ];
    }

    let channels = await Channel.find(query)
      .populate("members", "name email role photoUrl avatar")
      .populate("createdBy", "name email role")
      .sort({ isPinned: -1, name: 1 })
      .lean();

    // Seed defaults if empty and user is looking at channels
    if (channels.length === 0) {
      const existingAny = await Channel.findOne({ tenantId: tenantObjectId }).lean();
      if (!existingAny) {
        const docs = DEFAULT_CHANNELS.map((ch) => ({
          ...ch,
          createdBy: userObjectId,
          tenantId: tenantObjectId,
          members: [],
        }));
        const inserted = await Channel.insertMany(docs);
        channels = inserted.map((doc) => (doc.toObject ? doc.toObject() : doc)) as any;
      }
    }

    return NextResponse.json({ channels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Channels error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new channel.
 * Supports public and private channels with initial members.
 * Checks both standard roles AND dynamic permissions from Settings > Permissions (createChatChannels).
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;

    const dataScope = await getUserDataScope(session);
    const canCreate =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      session.role === "Manager" ||
      dataScope.canViewFeature("createChatChannels");

    if (!canCreate) {
      return NextResponse.json({ error: "You do not have permission to create channels." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isPrivate, members } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanName) {
      return NextResponse.json({ error: "Invalid channel name format" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Channel.findOne({ tenantId: tenantObjectId, name: cleanName });
    if (existing) {
      return NextResponse.json({ error: "Channel with this name already exists" }, { status: 400 });
    }

    const isPrivateBool = Boolean(isPrivate);
    let memberIds: mongoose.Types.ObjectId[] = [];

    if (isPrivateBool) {
      const rawList = Array.isArray(members) ? members : [];
      const validIds = new Set<string>();

      // Always ensure the channel creator is a member
      validIds.add(userObjectId.toString());

      rawList.forEach((mId: string) => {
        if (mId && mongoose.Types.ObjectId.isValid(mId)) {
          validIds.add(mId.toString());
        }
      });

      memberIds = Array.from(validIds).map((id) => new mongoose.Types.ObjectId(id));
    }

    const newChannel = await Channel.create({
      name: cleanName,
      description: description?.trim() || "",
      isPinned: false,
      isPrivate: isPrivateBool,
      members: memberIds,
      createdBy: userObjectId,
      tenantId: tenantObjectId,
    });

    const populatedChannel = await Channel.findById(newChannel._id)
      .populate("members", "name email role photoUrl avatar")
      .populate("createdBy", "name email role")
      .lean();

    return NextResponse.json({ channel: populatedChannel || newChannel }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Channel error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Pin/Unpin, Reactivate, or Manage Members of a channel.
 * Body: { channelId: string, isPinned?: boolean, isActive?: boolean, description?: string, members?: string[], action?: "addMember" | "removeMember", memberId?: string }
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { channelId, isPinned, isActive, description, members, action, memberId } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const existingChannel = await Channel.findOne({ _id: channelId, tenantId: tenantObjectId });
    if (!existingChannel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const dataScope = await getUserDataScope(session);
    const isSuperRole = session.role === "Admin" || isSubAdminRole(session.role);
    const isCreator = existingChannel.createdBy.equals(userObjectId);
    const isManager = session.role === "Manager";
    const canManage =
      isSuperRole ||
      isCreator ||
      isManager ||
      dataScope.canViewFeature("createChatChannels") ||
      dataScope.canViewFeature("pinChatMessages");

    if (!canManage) {
      return NextResponse.json({ error: "You do not have permission to modify this channel." }, { status: 403 });
    }

    const updateFields: any = {};
    if (typeof isPinned === "boolean") updateFields.isPinned = isPinned;
    if (typeof isActive === "boolean") updateFields.isActive = isActive;
    if (typeof description === "string") updateFields.description = description.trim();

    // Member management for private channels
    if (existingChannel.isPrivate) {
      if (action === "addMember" && memberId && mongoose.Types.ObjectId.isValid(memberId)) {
        await Channel.updateOne(
          { _id: channelId, tenantId: tenantObjectId },
          { $addToSet: { members: new mongoose.Types.ObjectId(memberId) } }
        );
      } else if (action === "removeMember" && memberId && mongoose.Types.ObjectId.isValid(memberId)) {
        // Prevent removing the channel creator
        if (existingChannel.createdBy.toString() === memberId.toString()) {
          return NextResponse.json({ error: "Cannot remove the channel creator." }, { status: 400 });
        }
        await Channel.updateOne(
          { _id: channelId, tenantId: tenantObjectId },
          { $pull: { members: new mongoose.Types.ObjectId(memberId) } }
        );
      } else if (Array.isArray(members)) {
        const cleanMembers = new Set<string>();
        // Creator must always remain in members
        cleanMembers.add(existingChannel.createdBy.toString());
        members.forEach((id: string) => {
          if (id && mongoose.Types.ObjectId.isValid(id)) cleanMembers.add(id);
        });
        updateFields.members = Array.from(cleanMembers).map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, tenantId: tenantObjectId },
      { $set: updateFields },
      { returnDocument: "after" }
    )
      .populate("members", "name email role photoUrl avatar")
      .populate("createdBy", "name email role");

    return NextResponse.json({ success: true, channel });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Channel error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Move channel to inactive status (soft delete) or delete permanently.
 * Query: ?id=channelId
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
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

    const dataScope = await getUserDataScope(session);
    const isSuperRole = session.role === "Admin" || isSubAdminRole(session.role);
    const isCreator = channel.createdBy.equals(userObjectId);
    const isManager = session.role === "Manager";
    const canDelete =
      isSuperRole ||
      isCreator ||
      isManager ||
      dataScope.canViewFeature("deleteChatChannels");

    if (!canDelete) {
      return NextResponse.json({ error: "You do not have permission to delete this channel." }, { status: 403 });
    }

    if (channel.name === "general") {
      return NextResponse.json({ error: "The default #general channel cannot be removed." }, { status: 400 });
    }

    if (channel.isActive !== false) {
      // Step 1: Move to inactive state (soft delete)
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
