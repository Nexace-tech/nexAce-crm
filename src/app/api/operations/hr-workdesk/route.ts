import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRResourceAllocation } from "@/models/HRResourceAllocation";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_ALLOCATIONS = [
  { employeeName: "Ahmed Raza", role: "Senior Developer", department: "Engineering", assignedProject: "NovaTech ERP", allocatedHoursPerWeek: 40, utilizationRate: 100, status: "Deployed", startDate: "2026-07-01" },
  { employeeName: "Sara Khan", role: "UI/UX Designer", department: "Design", assignedProject: "Apex Brand Revamp", allocatedHoursPerWeek: 30, utilizationRate: 75, status: "Partially Allocated", startDate: "2026-07-15" },
  { employeeName: "Omar Malik", role: "Project Manager", department: "Operations", assignedProject: "Greenfield HR Module", allocatedHoursPerWeek: 40, utilizationRate: 100, status: "Deployed", startDate: "2026-06-01" },
  { employeeName: "Fatima Noor", role: "Content Strategist", department: "Marketing", assignedProject: "AlphaStream Retainer", allocatedHoursPerWeek: 20, utilizationRate: 50, status: "Partially Allocated", startDate: "2026-07-01" },
  { employeeName: "Bilal Hassan", role: "DevOps Engineer", department: "Engineering", assignedProject: "Unassigned", allocatedHoursPerWeek: 0, utilizationRate: 0, status: "Bench", startDate: "2026-08-01" },
  { employeeName: "Ayesha Qureshi", role: "Business Analyst", department: "Operations", assignedProject: "TerraFund Audit", allocatedHoursPerWeek: 32, utilizationRate: 80, status: "Deployed", startDate: "2026-06-15" },
  { employeeName: "Tariq Hussain", role: "QA Engineer", department: "Engineering", assignedProject: "Unassigned", allocatedHoursPerWeek: 0, utilizationRate: 0, status: "On Leave", startDate: "2026-08-05" },
  { employeeName: "Mariam Siddiqui", role: "Junior Developer", department: "Engineering", assignedProject: "NovaTech ERP", allocatedHoursPerWeek: 40, utilizationRate: 100, status: "Deployed", startDate: "2026-07-01" },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    let allocations = await HRResourceAllocation.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (allocations.length === 0) {
      const seedDocs = SEED_ALLOCATIONS.map((a) => ({
        ...a,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await HRResourceAllocation.insertMany(seedDocs);
      allocations = await HRResourceAllocation.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ allocations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/operations/hr-workdesk error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { employeeName, role, department, assignedProject, allocatedHoursPerWeek, utilizationRate, status, startDate, notes } = body;

    if (!employeeName?.trim()) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const allocation = await HRResourceAllocation.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      employeeName: employeeName.trim(),
      role: role?.trim() || "",
      department: department?.trim() || "Engineering",
      assignedProject: assignedProject?.trim() || "Unassigned",
      allocatedHoursPerWeek: Number(allocatedHoursPerWeek) || 0,
      utilizationRate: Number(utilizationRate) || 0,
      status: status || "Bench",
      startDate: startDate || "",
      notes: notes?.trim() || "",
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "HR_ALLOCATION_CREATED",
      targetName: employeeName.trim(),
      details: `Added resource allocation for "${employeeName.trim()}" → ${assignedProject || "Unassigned"}`,
    });

    return NextResponse.json({ allocation }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/operations/hr-workdesk error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
