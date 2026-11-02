import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CompensationPolicy } from "@/models/CompensationPolicy";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { isSubAdminRole } from "@/lib/roles";

const DEFAULT_COMPENSATION_POLICY_SEED = {
  enabled: true,
  lopFormula: {
    divisorMode: "calendar_days" as const,
    customDivisorDays: 30,
    graceAbsenceDays: 0,
    autoCalculateLop: true,
  },
  overtimeRules: {
    standardMultiplier: 1.5,
    weekendMultiplier: 2.0,
    holidayMultiplier: 2.0,
    monthlyCapHours: 40,
    allowEmployeeOtClaim: true,
  },
  taxRules: {
    defaultTaxRate: 0,
    taxMode: "exclusive" as const,
    tdsRate: 10,
    taxLabel: "GST",
    enforcePfWageCap: false,
    enforceEsiCeiling: true,
  },
  allowancePresets: [
    {
      id: "allowance-hra",
      name: "House Rent Allowance (HRA)",
      type: "percentage" as const,
      value: 40,
      isDefault: true,
      targetEmploymentType: "Permanent" as const,
      description: "Standard 40% of base salary for house rent allowance",
    },
    {
      id: "allowance-special",
      name: "Special Allowance",
      type: "percentage" as const,
      value: 15,
      isDefault: true,
      targetEmploymentType: "Permanent" as const,
      description: "Monthly skill and utility performance allowance",
    },
    {
      id: "allowance-conveyance",
      name: "Conveyance Allowance",
      type: "fixed" as const,
      value: 1600,
      isDefault: false,
      targetEmploymentType: "All" as const,
      description: "Fixed local transit and travel reimbursement",
    },
    {
      id: "allowance-bonus",
      name: "Performance Bonus / Incentive",
      type: "fixed" as const,
      value: 0,
      isDefault: false,
      targetEmploymentType: "All" as const,
      description: "Monthly or milestone achievement variable bonus",
    },
    {
      id: "allowance-internet",
      name: "Broadband & Remote Work Allowance",
      type: "fixed" as const,
      value: 1200,
      isDefault: false,
      targetEmploymentType: "All" as const,
      description: "Home internet and communication stipend",
    },
  ],
  deductionPresets: [
    {
      id: "deduct-pf",
      name: "Provident Fund (PF / EPF)",
      type: "percentage" as const,
      value: 12,
      isDefault: true,
      targetEmploymentType: "Permanent" as const,
      description: "Statutory employee retirement fund (12% of basic)",
    },
    {
      id: "deduct-pt",
      name: "Professional Tax (PT)",
      type: "fixed" as const,
      value: 200,
      isDefault: true,
      targetEmploymentType: "Permanent" as const,
      description: "State government statutory municipal professional tax",
    },
    {
      id: "deduct-esi",
      name: "Employee State Insurance (ESI)",
      type: "percentage" as const,
      value: 0.75,
      isDefault: false,
      targetEmploymentType: "Permanent" as const,
      description: "State medical insurance for applicable wage tiers",
    },
    {
      id: "deduct-insurance",
      name: "Group Medical Insurance Premium",
      type: "fixed" as const,
      value: 500,
      isDefault: false,
      targetEmploymentType: "All" as const,
      description: "Corporate group mediclaim employee co-pay",
    },
    {
      id: "deduct-tds",
      name: "TDS / Tax Withholding",
      type: "percentage" as const,
      value: 10,
      isDefault: false,
      targetEmploymentType: "Contractor" as const,
      description: "Tax Withheld at Source on contractor / professional fees",
    },
  ],
  otherCharges: [
    {
      id: "charge-late",
      name: "Late Timesheet Submission Fee",
      type: "fixed" as const,
      value: 0,
      isAddition: false,
      description: "Penalty deduction for unapproved late timesheet filing",
    },
    {
      id: "charge-hardware",
      name: "Asset & Hardware Recovery",
      type: "fixed" as const,
      value: 0,
      isAddition: false,
      description: "Deduction for unreturned or damaged hardware assets",
    },
  ],
  currency: "INR",
  notes: "Tenant-wide compensation, LOP formula, and invoice policy",
};

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    let policy: any = await CompensationPolicy.findOne({ tenantId: tenantObjectId }).lean();

    // Auto-seed initial tenant policy if none exists yet
    if (!policy) {
      const created = await CompensationPolicy.create({
        ...DEFAULT_COMPENSATION_POLICY_SEED,
        tenantId: tenantObjectId,
        updatedBy: {
          userName: "System Default",
          role: "System",
          date: new Date(),
        },
      });
      policy = created.toObject();
    } else {
      // Auto-heal missing critical structures if policy has empty presets or uninitialized toggle
      let needsHeal = false;
      const patch: any = {};
      if (policy.enabled === undefined) {
        policy.enabled = true;
        patch.enabled = true;
        needsHeal = true;
      }
      if (!Array.isArray(policy.deductionPresets) || policy.deductionPresets.length === 0) {
        policy.deductionPresets = DEFAULT_COMPENSATION_POLICY_SEED.deductionPresets;
        patch.deductionPresets = DEFAULT_COMPENSATION_POLICY_SEED.deductionPresets;
        needsHeal = true;
      }
      if (!Array.isArray(policy.allowancePresets) || policy.allowancePresets.length === 0) {
        policy.allowancePresets = DEFAULT_COMPENSATION_POLICY_SEED.allowancePresets;
        patch.allowancePresets = DEFAULT_COMPENSATION_POLICY_SEED.allowancePresets;
        needsHeal = true;
      }
      if (needsHeal) {
        await CompensationPolicy.updateOne({ tenantId: tenantObjectId }, { $set: patch });
      }
    }

    return NextResponse.json({ policy });
  } catch (error: unknown) {
    console.error("GET /api/finance/compensation-policy error:", error);
    return NextResponse.json({ error: "Failed to fetch compensation policy" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { getUserDataScope } = await import("@/lib/dataScope");
    const dataScope = await getUserDataScope(session);
    const roleLower = (session.role || "").trim().toLowerCase();
    const isAdmin = roleLower === "admin";
    const isOPS = roleLower === "ops" || isSubAdminRole(session.role);
    const isHR = roleLower === "hr";
    const canManagePayroll = dataScope.canViewFeature("managePayroll") || dataScope.canViewFeature("manageCompensationPolicy") || dataScope.canViewFeature("adjustSalarySlips");

    const canEditPolicy = isAdmin || isOPS || canManagePayroll;

    if (!canEditPolicy) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to adjust compensation policies and calculation rules" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await req.json();

    const updateData: any = {
      updatedBy: {
        userId: userObjectId,
        userName: session.userName || "Admin",
        role: session.role || "Admin",
        date: new Date(),
      },
    };

    if (body.enabled !== undefined) {
      updateData.enabled = Boolean(body.enabled);
    }

    if (body.lopFormula) {
      updateData.lopFormula = {
        divisorMode: body.lopFormula.divisorMode || "calendar_days",
        customDivisorDays: Number(body.lopFormula.customDivisorDays) || 30,
        graceAbsenceDays: Number(body.lopFormula.graceAbsenceDays) || 0,
        autoCalculateLop: body.lopFormula.autoCalculateLop !== undefined ? Boolean(body.lopFormula.autoCalculateLop) : true,
      };
    }

    if (body.overtimeRules) {
      updateData.overtimeRules = {
        standardMultiplier: Number(body.overtimeRules.standardMultiplier) || 1.5,
        weekendMultiplier: Number(body.overtimeRules.weekendMultiplier) || 2.0,
        holidayMultiplier: Number(body.overtimeRules.holidayMultiplier) || 2.0,
        monthlyCapHours: Number(body.overtimeRules.monthlyCapHours) || 40,
        allowEmployeeOtClaim: body.overtimeRules.allowEmployeeOtClaim !== undefined ? Boolean(body.overtimeRules.allowEmployeeOtClaim) : true,
      };
    }

    if (body.taxRules) {
      updateData.taxRules = {
        defaultTaxRate: Number(body.taxRules.defaultTaxRate) || 0,
        taxMode: body.taxRules.taxMode || "exclusive",
        tdsRate: Number(body.taxRules.tdsRate) || 10,
        taxLabel: (body.taxRules.taxLabel || "GST").trim(),
        enforcePfWageCap: Boolean(body.taxRules.enforcePfWageCap),
        enforceEsiCeiling: body.taxRules.enforceEsiCeiling !== undefined ? Boolean(body.taxRules.enforceEsiCeiling) : true,
      };
    }

    if (Array.isArray(body.allowancePresets)) {
      updateData.allowancePresets = body.allowancePresets.map((a: any, idx: number) => ({
        id: a.id || `allowance-${Date.now()}-${idx}`,
        name: (a.name || "Allowance").trim(),
        type: a.type === "percentage" ? "percentage" : "fixed",
        value: Number(a.value) || 0,
        isDefault: Boolean(a.isDefault),
        targetEmploymentType: a.targetEmploymentType || "All",
        description: (a.description || "").trim(),
      }));
    }

    if (Array.isArray(body.deductionPresets)) {
      updateData.deductionPresets = body.deductionPresets.map((d: any, idx: number) => ({
        id: d.id || `deduct-${Date.now()}-${idx}`,
        name: (d.name || "Deduction").trim(),
        type: d.type === "percentage" ? "percentage" : "fixed",
        value: Number(d.value) || 0,
        isDefault: Boolean(d.isDefault),
        targetEmploymentType: d.targetEmploymentType || "All",
        description: (d.description || "").trim(),
      }));
    }

    if (Array.isArray(body.otherCharges)) {
      updateData.otherCharges = body.otherCharges.map((c: any, idx: number) => ({
        id: c.id || `charge-${Date.now()}-${idx}`,
        name: (c.name || "Charge").trim(),
        type: c.type === "percentage" ? "percentage" : "fixed",
        value: Number(c.value) || 0,
        isAddition: Boolean(c.isAddition),
        description: (c.description || "").trim(),
      }));
    }

    if (body.currency) {
      updateData.currency = body.currency;
    }

    if (body.notes !== undefined) {
      updateData.notes = String(body.notes);
    }

    const updated = await CompensationPolicy.findOneAndUpdate(
      { tenantId: tenantObjectId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, policy: updated });
  } catch (error: unknown) {
    console.error("PUT /api/finance/compensation-policy error:", error);
    return NextResponse.json({ error: "Failed to update compensation policy" }, { status: 500 });
  }
}

