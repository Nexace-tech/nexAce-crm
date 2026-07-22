import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { DriveFile } from "@/models/DriveFile";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Define the local upload folder inside the workspace
const UPLOAD_DIR = path.join(process.cwd(), "src", "uploads");

/**
 * GET: Fetch all drive files logged in the tenant.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const files = await DriveFile.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    })
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("API GET Drive error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Upload a file locally (Simulated Cloud storage in workspace sandbox).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const fileName = (formData.get("fileName") as string) || (file as any).name || "uploaded_file";
    const mimeType = file.type || "application/octet-stream";
    const size = file.size;

    // Convert file Blob to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Save file on disk with a timestamped safe filename
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const destinationPath = path.join(UPLOAD_DIR, safeName);
    
    fs.writeFileSync(destinationPath, buffer);

    await connectToDatabase();

    // Log file metadata in DB
    const newFile = await DriveFile.create({
      name: fileName,
      size,
      mimeType,
      filePath: safeName, // relative path to target uploads
      folder: "/",
      uploadedBy: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, file: newFile }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Drive error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove file from disk and database metadata.
 * Body: { fileId: string }
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const file = await DriveFile.findById(fileId);
    if (!file || file.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions: restricted to uploader or Admin
    const isOwner = file.uploadedBy.toString() === session.userId;
    const isAdmin = session.role === "Admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    // Remove file from disk
    const diskPath = path.join(UPLOAD_DIR, file.filePath);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    // Remove from DB
    await file.deleteOne();

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE Drive error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
