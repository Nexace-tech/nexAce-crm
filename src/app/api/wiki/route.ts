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
  } catch (error: any) {
    console.error("API GET Wiki error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new wiki article.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const newArticle = await Wiki.create({
      title,
      content,
      createdBy: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, article: newArticle }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Wiki error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update an existing wiki article.
 * Body: { articleId: string, title?: string, content?: string }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { articleId, title, content } = body;

    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const article = await Wiki.findById(articleId);
    if (!article || article.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;

    await article.save();

    return NextResponse.json({ success: true, article });
  } catch (error: any) {
    console.error("API PUT Wiki error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
