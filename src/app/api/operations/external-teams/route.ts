import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ExternalTeam } from "@/models/ExternalTeam";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_EXTERNAL_TEAMS = [
  {
    name: "Alex Rivera",
    email: "alex.rivera@devstudio.io",
    companyName: "DevStudio Solutions Ltd",
    role: "Lead Full-Stack Contractor",
    serviceCategory: "Software Development",
    assignedProject: "NexAce Cloud CRM",
    hourlyRate: 3500,
    currency: "INR",
    status: "Active",
    phone: "+91 98765 43210",
    notes: "Specializes in Next.js, Node.js & Mongo performance tuning.",
  },
  {
    name: "Sophia Chen",
    email: "sophia@pixelcraft.design",
    companyName: "PixelCraft Agency",
    role: "Senior UI/UX Specialist",
    serviceCategory: "UI/UX Design",
    assignedProject: "Operation Portal Redesign",
    hourlyRate: 2800,
    currency: "INR",
    status: "Active",
    phone: "+91 98765 43211",
    notes: "Handles design systems, Figma prototypes, and responsive components.",
  },
  {
    name: "Marcus Vance",
    email: "marcus.v@cloudshield.net",
    companyName: "CloudShield Security",
    role: "Cybersecurity & DevOps Consultant",
    serviceCategory: "DevOps & Infrastructure",
    assignedProject: "ISO 27001 Security Audit",
    hourlyRate: 4500,
    currency: "INR",
    status: "Active",
    phone: "+91 98765 43212",
    notes: "External contractor for penetration testing and cloud compliance.",
  },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();
    let externalMembers = await ExternalTeam.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .lean();

    if (externalMembers.length === 0) {
      const seedDocs = SEED_EXTERNAL_TEAMS.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ExternalTeam.insertMany(seedDocs);
      externalMembers = await ExternalTeam.find({ tenantId: tenantObjectId })
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json({ externalMembers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/operations/external-teams error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { name, email, companyName, role, serviceCategory, assignedProject, hourlyRate, currency, status, phone, notes } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and Email are required." }, { status: 400 });
    }

    await connectToDatabase();

    const created = await ExternalTeam.create({
      tenantId: tenantObjectId,
      name,
      email: email.toLowerCase(),
      companyName: companyName || "Independent Contractor",
      role: role || "External Contractor",
      serviceCategory: serviceCategory || "Software Development",
      assignedProject: assignedProject || "General Operational Support",
      hourlyRate: Number(hourlyRate) || 0,
      currency: currency || "INR",
      status: status || "Active",
      phone: phone || "",
      notes: notes || "",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "EXTERNAL_TEAM_MEMBER_ADDED",
      targetName: created.name,
      details: `Added external team member: ${created.name} (${created.companyName})`,
    });

    return NextResponse.json({ externalMember: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/operations/external-teams error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
