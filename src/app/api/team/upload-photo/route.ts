import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";

// Define the public uploads directory
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// File size limits
const MIN_FILE_SIZE = 1024;          // 1 KB minimum — rejects empty/corrupt files
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB maximum

/**
 * POST: Upload a profile picture locally.
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

    // Basic validation: must be an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image" }, { status: 400 });
    }

    // Convert file Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Reject corrupt / empty files
    if (buffer.length < MIN_FILE_SIZE) {
      return NextResponse.json({ error: "Uploaded file appears to be empty or corrupt (too small)" }, { status: 400 });
    }

    // Reject oversized files
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum allowed size is 5MB." }, { status: 413 });
    }

    const originalName = (file as any).name || "avatar.jpg";
    const extension = path.extname(originalName) || ".jpg";

    // Ensure public/uploads exists
    await mkdir(PUBLIC_UPLOAD_DIR, { recursive: true });

    // Clean up previous avatars for this user to save disk space
    try {
      const existingFiles = await readdir(PUBLIC_UPLOAD_DIR);
      const userPrefix = `avatar-${session.userId}-`;
      await Promise.all(
        existingFiles
          .filter((f) => f.startsWith(userPrefix))
          .map((f) => unlink(path.join(PUBLIC_UPLOAD_DIR, f)).catch(() => {}))
      );
    } catch {
      // Non-fatal — continue with upload even if cleanup fails
    }

    // Save with unique name to prevent collisions
    const safeName = `avatar-${session.userId}-${Date.now()}${extension}`;
    const destinationPath = path.join(PUBLIC_UPLOAD_DIR, safeName);

    await writeFile(destinationPath, buffer);

    // Return the public URL path
    const photoUrl = `/uploads/${safeName}`;
    return NextResponse.json({ success: true, photoUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Profile Photo Upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
