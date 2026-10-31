import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ChecklistPreset } from "@/models/ChecklistPreset";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { isSubAdminRole } from "@/lib/roles";

const DEFAULT_PRESETS_SEED = [
  {
    name: "Full-Time Standard (5 Docs)",
    description: "Company standard onboarding: ID proof, NDA, KRA Sign-off, Hardware Pass, and CRM Access.",
    targetEmploymentType: "Permanent" as const,
    isSystemDefault: true,
    items: [
      { id: "1", title: "Submit Identity & Address Proof", category: "Document" as const, required: true },
      { id: "2", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA" as const, required: true },
      { id: "3", title: "KRA & Job Description Sign-off", category: "KRA Sign-off" as const, required: true },
      { id: "4", title: "Issue Work Laptop & Access Pass", category: "IT Asset" as const, required: true },
      { id: "5", title: "Provision CRM & Email Accounts", category: "Access" as const, required: true },
    ],
  },
  {
    name: "Part-Time Alignment (5 Docs)",
    description: "Comprehensive onboarding: ID, Part-time Schedule Agreement, NDA, KRA, and System Access.",
    targetEmploymentType: "Part-Time" as const,
    isSystemDefault: true,
    items: [
      { id: "1", title: "Submit Identity & Address Proof", category: "Document" as const, required: true },
      { id: "2", title: "Part-Time Employment Agreement & Working Hours Schedule", category: "Contract" as const, required: true },
      { id: "3", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA" as const, required: true },
      { id: "4", title: "KRA & Shift Schedule Alignment", category: "KRA Sign-off" as const, required: true },
      { id: "5", title: "Provision System & Communication Access", category: "Access" as const, required: true },
    ],
  },
  {
    name: "Contractor Core (3 Docs)",
    description: "Standard contractor compliance: Identity Proof, Service Agreement, and Contractor NDA.",
    targetEmploymentType: "Contractor" as const,
    isSystemDefault: true,
    items: [
      { id: "1", title: "Submit Identity & Address Proof", category: "Document" as const, required: true },
      { id: "2", title: "Sign Independent Contractor Agreement / MSA", category: "Contract" as const, required: true },
      { id: "3", title: "Sign Contractor Non-Disclosure Agreement (NDA)", category: "NDA" as const, required: true },
    ],
  },
  {
    name: "Fast Contractor (2 Docs)",
    description: "Streamlined verification requiring only Identity Proof and Signed Service Agreement.",
    targetEmploymentType: "Contractor" as const,
    isSystemDefault: true,
    items: [
      { id: "1", title: "Submit Identity & Address Proof", category: "Document" as const, required: true },
      { id: "2", title: "Sign Independent Contractor Agreement / MSA", category: "Contract" as const, required: true },
    ],
  },
  {
    name: "Quick NDA (1 Doc)",
    description: "Fast-track confidentiality agreement for short consultations or initial discussions.",
    targetEmploymentType: "All" as const,
    isSystemDefault: true,
    items: [
      { id: "1", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA" as const, required: true },
    ],
  },
];

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    let presets = await ChecklistPreset.find({ tenantId: tenantObjectId })
      .sort({ isSystemDefault: -1, createdAt: 1 })
      .lean();

    // Auto-seed default presets if tenant doesn't have any yet
    if (presets.length === 0) {
      const seedDocs = DEFAULT_PRESETS_SEED.map((p) => ({
        ...p,
        tenantId: tenantObjectId,
        createdBy: { userName: "System Default" },
      }));
      await ChecklistPreset.insertMany(seedDocs);
      presets = await ChecklistPreset.find({ tenantId: tenantObjectId })
        .sort({ isSystemDefault: -1, createdAt: 1 })
        .lean();
    }

    return NextResponse.json({ presets });
  } catch (error: unknown) {
    console.error("GET /api/hr/checklists/presets error:", error);
    return NextResponse.json({ error: "Failed to fetch checklist presets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { getUserDataScope } = await import("@/lib/dataScope");
    const dataScope = await getUserDataScope(session);
    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    const canManageChecklists =
      isAdmin ||
      isSubAdminRole(session.role) ||
      dataScope.canViewFeature("manageCompanyChecklists");

    if (!canManageChecklists) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create document presets" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await req.json();
    const { name, description, targetEmploymentType, items } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Preset name is required" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one document item is required in a preset" }, { status: 400 });
    }

    const cleanedItems = items.map((it: any, index: number) => ({
      id: it.id || String(index + 1),
      title: it.title?.trim() || `Document ${index + 1}`,
      category: it.category || "Document",
      required: it.required !== undefined ? Boolean(it.required) : true,
    }));

    const preset = await ChecklistPreset.create({
      tenantId: tenantObjectId,
      name: name.trim(),
      description: (description || "").trim(),
      targetEmploymentType: targetEmploymentType || "All",
      items: cleanedItems,
      isSystemDefault: false,
      createdBy: {
        userId: userObjectId,
        userName: session.userName || "HR Team",
      },
    });

    return NextResponse.json({ success: true, preset }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/checklists/presets error:", error);
    return NextResponse.json({ error: "Failed to create checklist preset" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const { getUserDataScope } = await import("@/lib/dataScope");
    const dataScope = await getUserDataScope(session);
    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");
    const canManageChecklists =
      isAdmin ||
      isSubAdminRole(session.role) ||
      dataScope.canViewFeature("manageCompanyChecklists");

    if (!canManageChecklists) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete document presets" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Preset id parameter is required" }, { status: 400 });
    }

    await connectToDatabase();
    const preset = await ChecklistPreset.findOne({ _id: id, tenantId: tenantObjectId });

    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }

    if (preset.isSystemDefault) {
      return NextResponse.json({ error: "Cannot delete built-in system default presets" }, { status: 400 });
    }

    await ChecklistPreset.deleteOne({ _id: id, tenantId: tenantObjectId });
    return NextResponse.json({ success: true, message: `Preset "${preset.name}" deleted` });
  } catch (error: unknown) {
    console.error("DELETE /api/hr/checklists/presets error:", error);
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}

