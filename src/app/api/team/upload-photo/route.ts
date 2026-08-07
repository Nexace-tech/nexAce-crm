import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Define the public uploads directory
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

    const originalName = (file as any).name || "avatar.jpg";
    const extension = path.extname(originalName) || ".jpg";

    // Convert file Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure public/uploads exists asynchronously
    await mkdir(PUBLIC_UPLOAD_DIR, { recursive: true });

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
