import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDriveLink } from "@/models/ITDriveLink";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_DRIVE_LINKS = [
  { name: "Premium Tools Tracker", category: "Ops/Admin", venture: "Ace Consultancy", platform: "Google Sheets", link: "https://docs.google.com/spreadsheets/d/1suXL", owner: "Ace", accessLevel: "Edit - Team", lastUpdated: "2026-07-28", reviewFrequency: "Monthly", notes: "Tracks premium tool subscriptions" },
  { name: "ID Access Tracker", category: "IT/Access", venture: "Ace Consultancy", platform: "Google Sheets", link: "https://docs.google.com/spreadsheets/d/1PwCl", owner: "Ace", accessLevel: "Edit - Team", lastUpdated: "2026-07-15", reviewFrequency: "Monthly", notes: "Source list for team access/ID tracking" },
  { name: "Bots Tracker", category: "AI/Automation", venture: "Ace Consultancy", platform: "Google Sheets", link: "https://docs.google.com/spreadsheets/d/1uhWA", owner: "Ace", accessLevel: "Edit - Team", lastUpdated: "2026-08-01", reviewFrequency: "Monthly", notes: "" },
  { name: "HR Intern JD", category: "HR/Recruiting", venture: "Ace Consultancy", platform: "Google Docs", link: "https://docs.google.com/document/d/YYuYik", owner: "Ace", accessLevel: "View - Team", lastUpdated: "2026-06-10", reviewFrequency: "As needed", notes: "Job description for HR Intern hiring round" },
  { name: "Performance Marketer JD", category: "HR/Recruiting", venture: "Ace Consultancy", platform: "Google Docs", link: "https://docs.google.com/document/d/73s1IMG", owner: "Ace", accessLevel: "View - Team", lastUpdated: "2026-05-22", reviewFrequency: "As needed", notes: "Hired — 1 hire" },
  { name: "Brand Guidelines 2026", category: "Brand/Design", venture: "Ace Consultancy", platform: "Notion", link: "https://notion.so/brand-guidelines", owner: "Design Lead", accessLevel: "View - Team", lastUpdated: "2026-08-05", reviewFrequency: "Quarterly", notes: "Master brand doc, do not edit without approval" },
  { name: "Client Onboarding SOP", category: "Ops/Admin", venture: "Ace Consultancy", platform: "Notion", link: "https://notion.so/client-onboarding-sop", owner: "Ops Team", accessLevel: "Edit - Team", lastUpdated: "2026-07-30", reviewFrequency: "Monthly", notes: "Step-by-step process for new client intake" },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();
    let links = await ITDriveLink.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (links.length === 0) {
      const seedDocs = SEED_DRIVE_LINKS.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITDriveLink.insertMany(seedDocs);
      links = await ITDriveLink.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    // Non-privileged users only receive links they own
    if (!isPrivileged) {
      const name = (session.userName || "").toLowerCase();
      links = links.filter((l: any) => (l.owner || "").toLowerCase() === name);
    }

    return NextResponse.json({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/drive-links error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST: Add a new IT Drive Link */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { name, category, venture, platform, link, owner, accessLevel, lastUpdated, reviewFrequency, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "File / Resource Name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await ITDriveLink.create({
      tenantId: tenantObjectId,
      name: name.trim(),
      category: category?.trim() || "",
      venture: venture?.trim() || "",
      platform: platform?.trim() || "Google Sheets",
      link: link?.trim() || "",
      owner: owner?.trim() || "",
      accessLevel: accessLevel?.trim() || "View - Team",
      lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
      reviewFrequency: reviewFrequency?.trim() || "Monthly",
      notes: notes?.trim() || "",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DRIVE_LINK_ADDED",
      targetName: name.trim(),
      details: `Added file link "${name.trim()}" (${platform || "Google Sheets"})`,
    });

    return NextResponse.json({ link: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/drive-links error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
