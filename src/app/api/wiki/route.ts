import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Wiki } from "@/models/Wiki";
import mongoose from "mongoose";

/**
 * GET: Fetch all wiki articles.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const articles = await Wiki.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    })
      .populate("createdBy", "name role photoUrl")
      .sort({ updatedAt: -1 });

    return NextResponse.json({ articles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Wiki error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new wiki article.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;

    const { session } = authResult;
    const body = await request.json();
    const { title, content, category } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const newArticle = await Wiki.create({
      title,
      category: category || "Operations",
      content,
      createdBy: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, article: newArticle }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Wiki error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update an existing wiki article.
 * Body: { articleId: string, title?: string, content?: string }
 */
export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    const body = await request.json();
    const { articleId, title, content } = body;

    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const article = await Wiki.findOne({ _id: articleId, tenantId: tenantObjectId });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (title !== undefined && title.trim()) article.title = title.trim();
    if (content !== undefined && content.trim()) article.content = content.trim();

    await article.save();

    return NextResponse.json({ success: true, article });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Wiki error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Delete a wiki article.
 * URL: /api/wiki?articleId=xxx
 */
export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const article = await Wiki.findOne({ _id: articleId, tenantId: tenantObjectId });
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await article.deleteOne();

    return NextResponse.json({ success: true, message: "Wiki article deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Wiki error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

