import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/models/Holiday";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Check if the user has permission to manage holidays
 */
async function canUserManageHolidays(session: any, tenantObjectId: mongoose.Types.ObjectId): Promise<boolean> {
  if (session.role?.toLowerCase() === "admin") return true;
  if (isSubAdminRole(session.role)) return true;

  try {
    const { RolePermission } = await import("@/models/RolePermission");
    const roleKey = isSubAdminRole(session.role) ? "OPS" : session.role;
    const permDoc = await RolePermission.findOne({
      tenantId: tenantObjectId,
      $or: [{ role: session.role }, { role: roleKey }],
    }).lean();

    if (permDoc?.featurePermissions?.manageHolidays !== undefined) {
      return Boolean(permDoc.featurePermissions.manageHolidays);
    }
    // HR role defaults to true unless explicitly revoked
    if (session.role === "HR") return true;
  } catch (err) {
    console.error("Error checking manageHolidays permission:", err);
  }
  return false;
}

/**
 * GET /api/holidays
 * Fetch holidays for the current tenant.
 * Query params:
 *   year       - e.g. 2026 (defaults to current year, or 'all')
 *   month      - 1-12 (optional)
 *   upcoming   - boolean (if true, only returns holidays on or after today)
 *   limit      - number (optional)
 *   type       - "Mandatory" | "Restricted" | "Company" | "All"
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const upcomingParam = searchParams.get("upcoming") === "true";
    const typeParam = searchParams.get("type");
    const limitParam = searchParams.get("limit");

    await connectToDatabase();

    const query: any = { tenantId: tenantObjectId };
    const now = new Date();
    const todayMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    if (yearParam && yearParam !== "all") {
      query.year = parseInt(yearParam, 10);
    } else if (!upcomingParam && !yearParam) {
      query.year = now.getFullYear();
    }

    if (monthParam) {
      query.month = parseInt(monthParam, 10);
    }

    if (upcomingParam) {
      query.date = { $gte: todayMidnight };
    }

    if (typeParam && typeParam !== "All") {
      query.type = typeParam;
    }

    // Auto-detect and auto-seed if 0 holidays exist for this tenant and target year
    const targetYear = query.year || now.getFullYear();
    const existingCount = await Holiday.countDocuments({ tenantId: tenantObjectId, year: targetYear });

    if (existingCount === 0) {
      try {
        const { Tenant } = await import("@/models/Tenant");
        const { getPresetHolidays } = await import("@/lib/holidays/defaultHolidays");
        const tenantDoc: any = await Tenant.findById(tenantObjectId).lean();
        const rawCountry = (tenantDoc?.country || "").toLowerCase();
        const rawTimezone = (tenantDoc?.timezone || "").toLowerCase();

        let country: "IN" | "US" = "IN";
        if (
          rawCountry.includes("united states") ||
          rawCountry === "us" ||
          rawCountry === "usa" ||
          rawTimezone.includes("america") ||
          rawTimezone.includes("us/")
        ) {
          country = "US";
        }

        const presets = getPresetHolidays(country, targetYear);
        if (presets && presets.length > 0) {
          const docsToInsert = presets.map((item) => {
            const parsedDate = new Date(item.date);
            const normalizedDate = new Date(
              Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
            );
            const yr = normalizedDate.getUTCFullYear();
            const mo = normalizedDate.getUTCMonth() + 1;
            const dow = DAYS_OF_WEEK[normalizedDate.getUTCDay()];

            return {
              tenantId: tenantObjectId,
              title: item.title,
              description: item.description || "",
              date: normalizedDate,
              year: yr,
              month: mo,
              dayOfWeek: dow,
              type: item.type,
              category: item.category,
              isHalfDay: Boolean(item.isHalfDay),
              applicableDepartments: [],
              locations: [],
              source: "Auto",
            };
          });

          await Holiday.insertMany(docsToInsert, { ordered: false });
        }
      } catch (seedErr) {
        console.error("Auto-seeding holidays on GET /api/holidays failed:", seedErr);
      }
    }

    let findQuery = Holiday.find(query).sort({ date: 1 });
    if (limitParam) {
      findQuery = findQuery.limit(parseInt(limitParam, 10));
    }

    const holidays = await findQuery.lean();

    // Compute stats for current year
    const allYearHolidays = await Holiday.find({ tenantId: tenantObjectId, year: targetYear }).lean();

    let mandatoryCount = 0;
    let restrictedCount = 0;
    let companyCount = 0;
    let remainingThisYear = 0;
    let longWeekendsCount = 0;

    for (const h of allYearHolidays) {
      if (h.type === "Mandatory") mandatoryCount++;
      else if (h.type === "Restricted") restrictedCount++;
      else if (h.type === "Company") companyCount++;

      const hDate = new Date(h.date);
      if (hDate >= todayMidnight) {
        remainingThisYear++;
      }

      // Check if holiday is Monday or Friday (Long Weekend!)
      const day = hDate.getUTCDay();
      if (day === 1 || day === 5) {
        longWeekendsCount++;
      }
    }

    return NextResponse.json({
      holidays,
      stats: {
        total: allYearHolidays.length,
        mandatory: mandatoryCount,
        restricted: restrictedCount,
        company: companyCount,
        remainingThisYear,
        longWeekendsCount,
        year: targetYear,
      },
    });
  } catch (error: any) {
    console.error("GET /api/holidays error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/holidays
 * Add a new holiday. Requires manageHolidays permission.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const allowed = await canUserManageHolidays(session, tenantObjectId);
    if (!allowed) {
      return NextResponse.json({ error: "Access denied. Insufficient permissions to manage holidays." }, { status: 403 });
    }

    const body = await request.json();
    const { title, date, type, category, applicableDepartments, locations, isHalfDay, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Holiday title is required." }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Holiday date is required." }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    // Normalize date to UTC Midnight
    const normalizedDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
    const year = normalizedDate.getUTCFullYear();
    const month = normalizedDate.getUTCMonth() + 1; // 1-12
    const dayOfWeek = DAYS_OF_WEEK[normalizedDate.getUTCDay()];

    await connectToDatabase();

    const holiday = await Holiday.create({
      title: title.trim(),
      description: (description || "").trim(),
      date: normalizedDate,
      year,
      month,
      dayOfWeek,
      type: type || "Mandatory",
      category: category || "National",
      applicableDepartments: applicableDepartments || ["All"],
      locations: locations || [],
      isHalfDay: Boolean(isHalfDay),
      tenantId: tenantObjectId,
      createdBy: userObjectId,
    });

    return NextResponse.json({ success: true, holiday }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/holidays error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
