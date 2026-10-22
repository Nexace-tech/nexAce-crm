import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/models/Holiday";
import { Tenant } from "@/models/Tenant";
import { getPresetHolidays } from "@/lib/holidays/defaultHolidays";
import { canUserManageHolidays } from "@/lib/holidays/holidayPermissions";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * POST /api/holidays/seed
 * Auto-detects the tenant's region/country from settings and seeds/syncs national public holidays.
 * Body options (optional):
 *   - country: "IN" | "US" (override auto-detection)
 *   - year: number (defaults to current year)
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const allowed = await canUserManageHolidays(session, tenantObjectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions to seed holidays." },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    await connectToDatabase();

    // 1. Auto-detect Country / Region if not explicitly specified
    let country: "IN" | "US" = "IN";
    if (body.country && (body.country === "IN" || body.country === "US")) {
      country = body.country;
    } else {
      const tenantDoc: any = await Tenant.findById(tenantObjectId).lean();
      const rawCountry = (tenantDoc?.country || "").toLowerCase();
      const rawTimezone = (tenantDoc?.timezone || "").toLowerCase();

      if (
        rawCountry.includes("united states") ||
        rawCountry === "us" ||
        rawCountry === "usa" ||
        rawTimezone.includes("america") ||
        rawTimezone.includes("us/")
      ) {
        country = "US";
      } else {
        country = "IN";
      }
    }

    // 2. Target Year
    const targetYear = body.year ? parseInt(body.year, 10) : new Date().getFullYear();

    // 3. Get Pre-defined Holiday definitions
    const presets = getPresetHolidays(country, targetYear);
    if (!presets || presets.length === 0) {
      return NextResponse.json(
        { error: `No preset holidays available for year ${targetYear} in country ${country}.` },
        { status: 400 }
      );
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of presets) {
      const parsedDate = new Date(item.date);
      const normalizedDate = new Date(
        Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
      );
      const year = normalizedDate.getUTCFullYear();
      const month = normalizedDate.getUTCMonth() + 1;
      const dayOfWeek = DAYS_OF_WEEK[normalizedDate.getUTCDay()];

      const existing = await Holiday.findOne({
        tenantId: tenantObjectId,
        date: normalizedDate,
      });

      if (existing) {
        existing.title = item.title;
        existing.description = item.description || existing.description || "";
        existing.type = item.type;
        existing.category = item.category;
        existing.isHalfDay = Boolean(item.isHalfDay);
        existing.year = year;
        existing.month = month;
        existing.dayOfWeek = dayOfWeek;
        await existing.save();
        updatedCount++;
      } else {
        await Holiday.create({
          title: item.title,
          description: item.description || "",
          date: normalizedDate,
          year,
          month,
          dayOfWeek,
          type: item.type,
          category: item.category,
          applicableDepartments: ["All"],
          locations: [],
          isHalfDay: Boolean(item.isHalfDay),
          tenantId: tenantObjectId,
          createdBy: userObjectId,
        });
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${presets.length} holidays for ${targetYear} (${
        country === "IN" ? "India" : "United States"
      }). Added: ${addedCount}, Updated: ${updatedCount}.`,
      addedCount,
      updatedCount,
      totalSynced: presets.length,
      detectedCountry: country,
      year: targetYear,
    });
  } catch (error: any) {
    console.error("POST /api/holidays/seed error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
