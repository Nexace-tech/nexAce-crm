import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import mongoose from "mongoose";

const DEFAULT_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "docx", "xlsx", "zip", "csv", "txt", "svg", "webp"];

/**
 * GET: Fetch tenant file upload settings (allowed file extensions).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const tenant = await Tenant.findById(session.tenantId);
    const allowedExtensions = tenant?.allowedExtensions && tenant.allowedExtensions.length > 0
      ? tenant.allowedExtensions
      : DEFAULT_EXTENSIONS;

    return NextResponse.json({ allowedExtensions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Allowed Files error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update tenant file upload settings (Admin restricted).
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { allowedExtensions } = body;

    if (!allowedExtensions || !Array.isArray(allowedExtensions)) {
      return NextResponse.json({ error: "allowedExtensions must be an array of file extensions" }, { status: 400 });
    }

    // Clean and normalize extensions (lowercase, strip dots and spaces)
    const cleanedExtensions = allowedExtensions
      .map((ext: string) => ext.trim().toLowerCase().replace(/^\./, ""))
      .filter((ext: string) => ext.length > 0);

    if (cleanedExtensions.length === 0) {
      return NextResponse.json({ error: "At least one file extension must be allowed" }, { status: 400 });
    }

    await connectToDatabase();

    const tenant = await Tenant.findByIdAndUpdate(
      session.tenantId,
      { allowedExtensions: cleanedExtensions },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      allowedExtensions: tenant?.allowedExtensions || cleanedExtensions,
      message: "File type restrictions updated successfully!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Allowed Files error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
