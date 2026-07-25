import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * GET: Fetch company announcements.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const announcements = await Announcement.find({ tenantId: tenantObjectId }).sort({
      pinned: -1,
      createdAt: -1,
    });

    return NextResponse.json({ announcements });
  } catch (error: any) {
    console.error("API GET Announcements error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new company announcement (Admin/Manager only).
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { title, content, category, pinned } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and Content are required" }, { status: 400 });
    }

    await connectToDatabase();

    const newAnnouncement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      category: category || "Company News",
      authorName: session.userName || "Admin",
      authorId: userObjectId,
      pinned: Boolean(pinned),
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ announcement: newAnnouncement, message: "Announcement published" }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Announcement error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
