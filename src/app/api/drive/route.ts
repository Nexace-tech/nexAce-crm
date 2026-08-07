import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { DriveFile } from "@/models/DriveFile";
import { ActivityLog } from "@/models/ActivityLog";
import { Tenant } from "@/models/Tenant";
import { notifyAdmins } from "@/lib/notify";
import mongoose from "mongoose";
import fs from "fs";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// Define the local upload folder inside the workspace (resolved for path traversal safety)
const UPLOAD_DIR = path.resolve(path.join(process.cwd(), "src", "uploads"));

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

    const isElevatedRole = session.role === "Admin";
    const queryCondition: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (!isElevatedRole) {
      queryCondition.uploadedBy = new mongoose.Types.ObjectId(session.userId);
    }

    const files = await DriveFile.find(queryCondition)
      .populate("uploadedBy", "name role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Drive error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
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

    // Fetch tenant allowed extensions setting
    const tenantDoc = await Tenant.findById(session.tenantId);
    const allowedExts: string[] = (tenantDoc?.allowedExtensions && tenantDoc.allowedExtensions.length > 0)
      ? tenantDoc.allowedExtensions.map((e: string) => e.toLowerCase())
      : ["png", "jpg", "jpeg", "pdf", "docx", "xlsx", "zip", "csv", "txt", "svg", "webp"];

    // Check uploaded file extension
    const fileExt = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
    if (fileExt && !allowedExts.includes(fileExt)) {
      return NextResponse.json({
        error: `File type '.${fileExt}' is not allowed by your Admin workspace policy. Allowed formats: ${allowedExts.map(e => `.${e}`).join(", ")}`
      }, { status: 400 });
    }

    // Convert file Blob to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = (formData.get("folder") as string) || "/";
    const targetDir = folder && folder !== "/" ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;

    // Ensure target directory exists (e.g. src/uploads/Chat)
    await mkdir(targetDir, { recursive: true });

    const ext = fileExt ? `.${fileExt}` : "";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const timestamp = now.getTime();

    // Custom File Naming: NexAceCRM_Year_Month_Day_TimeStamp
    let savedFileName = fileName;
    let diskFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    if (folder === "Chat" || folder.toLowerCase().includes("chat") || mimeType.startsWith("image/")) {
      savedFileName = `NexAceCRM_${year}_${month}_${day}_${timestamp}${ext}`;
      diskFileName = savedFileName;
    }

    const destinationPath = path.join(targetDir, diskFileName);
    // Fix #4: Use async write — avoids blocking the event loop during file uploads
    await writeFile(destinationPath, buffer);

    const relativeFilePath = folder && folder !== "/" ? path.join(folder, diskFileName) : diskFileName;

    await connectToDatabase();

    // Log file metadata in DB
    const newFile = await DriveFile.create({
      name: savedFileName,
      size,
      mimeType,
      filePath: relativeFilePath, // relative path to target uploads directory
      folder,
      uploadedBy: new mongoose.Types.ObjectId(session.userId),
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    // Record Activity Log
    await ActivityLog.create({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      userId: new mongoose.Types.ObjectId(session.userId),
      userName: session.userName,
      userRole: session.role,
      action: "FILE_UPLOADED",
      targetName: fileName,
      details: `Uploaded shared document '${fileName}' (${Math.round(size / 1024)} KB)`,
    });

    // Notify Workspace Admins of file upload
    await notifyAdmins(session.tenantId, {
      title: "New File Uploaded",
      message: `${session.userName} uploaded '${fileName}' to shared Drive.`,
      type: "system",
      linkUrl: "/dashboard/projects?tab=drive",
    });

    return NextResponse.json({ success: true, file: newFile }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Drive error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Remove file from disk and database metadata.
 * Body/Query: ?fileId=XYZ
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

    // Remove file from disk — with path traversal guard
    const diskPath = path.resolve(path.join(UPLOAD_DIR, file.filePath));
    if (diskPath.startsWith(UPLOAD_DIR + path.sep) || diskPath === UPLOAD_DIR) {
      try {
        await unlink(diskPath);
      } catch (e) {
        console.error("Failed to delete file from disk:", e);
      }
    } else {
      console.error(`Path traversal blocked on delete: ${file.filePath}`);
    }

    // Remove from DB
    await file.deleteOne();

    await ActivityLog.create({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      userId: new mongoose.Types.ObjectId(session.userId),
      userName: session.userName,
      userRole: session.role,
      action: "FILE_DELETED",
      targetName: file.name,
      details: `Deleted file '${file.name}' from Drive Space`,
    });

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Drive error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
