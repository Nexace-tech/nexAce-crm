import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { User } from "@/models/User";
import { DriveFile } from "@/models/DriveFile";
import { ActivityLog } from "@/models/ActivityLog";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";

// Define the public uploads resumes directory & Drive uploads directory
const RESUMES_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "resumes");
const DRIVE_RESUMES_DIR = path.resolve(path.join(process.cwd(), "src", "uploads", "Resumes"));

// File size limits
const MIN_FILE_SIZE = 100;                 // 100 bytes minimum
const MAX_FILE_SIZE = 10 * 1024 * 1024;    // 10 MB maximum

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

/**
 * POST: Upload a user's resume (PDF, DOC, DOCX) and associate it with their profile.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const targetUserId = (formData.get("userId") as string) || session.userId;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    // Permission check if updating another user's resume
    if (targetUserId !== session.userId) {
      const { getUserDataScope } = await import("@/lib/dataScope");
      const { isSubAdminRole } = await import("@/lib/roles");
      const dataScope = await getUserDataScope(session);
      const isAdminSession = session.role === "Admin" || isSubAdminRole(session.role);
      const canManageUsers = isAdminSession || dataScope.canViewFeature("manageUsers");
      if (!canManageUsers) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    const originalName = (file as any).name || "resume.pdf";
    const extension = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a PDF, DOC, or DOCX document." },
        { status: 400 }
      );
    }

    // Convert file Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Reject corrupt / empty files
    if (buffer.length < MIN_FILE_SIZE) {
      return NextResponse.json(
        { error: "Uploaded file appears to be empty or corrupt." },
        { status: 400 }
      );
    }

    // Reject oversized files
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 10MB." },
        { status: 413 }
      );
    }

    // Ensure public/uploads/resumes and src/uploads/Resumes exist
    await mkdir(RESUMES_UPLOAD_DIR, { recursive: true });
    await mkdir(DRIVE_RESUMES_DIR, { recursive: true });

    // Clean up previous resumes for this user to save disk space
    try {
      const existingPublicFiles = await readdir(RESUMES_UPLOAD_DIR);
      const userPrefix = `resume-${targetUserId}-`;
      await Promise.all(
        existingPublicFiles
          .filter((f) => f.startsWith(userPrefix))
          .map((f) => unlink(path.join(RESUMES_UPLOAD_DIR, f)).catch(() => {}))
      );

      const existingDriveFiles = await readdir(DRIVE_RESUMES_DIR);
      await Promise.all(
        existingDriveFiles
          .filter((f) => f.startsWith(userPrefix))
          .map((f) => unlink(path.join(DRIVE_RESUMES_DIR, f)).catch(() => {}))
      );
    } catch {
      // Non-fatal — continue with upload even if cleanup fails
    }

    // Save with unique name to prevent collisions
    const safeName = `resume-${targetUserId}-${Date.now()}${extension}`;
    const destinationPath = path.join(RESUMES_UPLOAD_DIR, safeName);
    const driveDestinationPath = path.join(DRIVE_RESUMES_DIR, safeName);

    await Promise.all([
      writeFile(destinationPath, buffer),
      writeFile(driveDestinationPath, buffer),
    ]);

    const resumeUrl = `/uploads/resumes/${safeName}`;
    const resumeFileName = originalName;
    const resumeFileSize = buffer.length;
    const resumeUpdatedAt = new Date();

    // Persist to user database record
    await connectToDatabase();
    const targetUser = await User.findById(targetUserId);

    await User.updateOne(
      { _id: targetUserId },
      {
        $set: {
          resumeUrl,
          resumeFileName,
          resumeFileSize,
          resumeUpdatedAt,
        },
      }
    );

    // Sync to Drive Files repository so it shows up in Drive Space for Admins
    try {
      await DriveFile.deleteMany({
        uploadedBy: targetUserId,
        folder: "Resumes",
      });

      const driveDisplayName = `Resume - ${targetUser?.name || "Employee"} (${originalName})`;
      await DriveFile.create({
        name: driveDisplayName,
        size: buffer.length,
        mimeType: extension === ".pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filePath: path.join("Resumes", safeName),
        folder: "Resumes",
        uploadedBy: new mongoose.Types.ObjectId(targetUserId),
        tenantId: targetUser?.tenantId || session.tenantId,
      });

      // Record Activity Log
      await ActivityLog.create({
        tenantId: targetUser?.tenantId || session.tenantId,
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        userRole: session.role,
        action: "FILE_UPLOADED",
        targetName: driveDisplayName,
        details: `Uploaded resume '${driveDisplayName}' (${Math.round(buffer.length / 1024)} KB)`,
      });
    } catch (driveErr) {
      console.error("Error syncing resume to DriveFile:", driveErr);
    }

    return NextResponse.json({
      success: true,
      resumeUrl,
      resumeFileName,
      resumeFileSize,
      resumeUpdatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Resume Upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Remove the user's uploaded resume.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || session.userId;

    if (targetUserId !== session.userId) {
      const { getUserDataScope } = await import("@/lib/dataScope");
      const { isSubAdminRole } = await import("@/lib/roles");
      const dataScope = await getUserDataScope(session);
      const isAdminSession = session.role === "Admin" || isSubAdminRole(session.role);
      const canManageUsers = isAdminSession || dataScope.canViewFeature("manageUsers");
      if (!canManageUsers) {
        return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
      }
    }

    await connectToDatabase();
    const user = await User.findById(targetUserId);

    if (user && user.resumeUrl) {
      // Clean up files from both disk locations
      try {
        const publicFilePath = path.join(process.cwd(), "public", user.resumeUrl.replace(/^\//, ""));
        await unlink(publicFilePath).catch(() => {});

        const fileName = path.basename(user.resumeUrl);
        const driveFilePath = path.join(DRIVE_RESUMES_DIR, fileName);
        await unlink(driveFilePath).catch(() => {});
      } catch {
        // Non-fatal
      }
    }

    await User.updateOne(
      { _id: targetUserId },
      {
        $set: {
          resumeUrl: "",
          resumeFileName: "",
          resumeFileSize: 0,
          resumeUpdatedAt: null,
        },
      }
    );

    // Also remove from Drive Files repository
    try {
      await DriveFile.deleteMany({
        uploadedBy: targetUserId,
        folder: "Resumes",
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ success: true, message: "Resume removed successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Resume Delete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
