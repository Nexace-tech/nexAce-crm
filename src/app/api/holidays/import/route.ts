import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/models/Holiday";
import { canUserImportHolidays } from "@/lib/holidays/holidayPermissions";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const VALID_TYPES = ["Mandatory", "Restricted", "Company"] as const;
const VALID_CATEGORIES = ["National", "Religious", "Cultural", "Corporate"] as const;

interface ImportItem {
  title: string;
  date: string | number | Date;
  type?: string;
  category?: string;
  applicableDepartments?: string[] | string;
  locations?: string[] | string;
  isHalfDay?: boolean;
  description?: string;
}

/**
 * POST /api/holidays/import
 * Bulk import holidays from parsed Excel / CSV rows.
 * Requires importHolidayExcel or manageHolidays permission.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const allowed = await canUserImportHolidays(session, tenantObjectId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Access denied. Insufficient permissions to import holiday spreadsheets." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const items: ImportItem[] = body.holidays;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No holiday rows provided for import." },
        { status: 400 }
      );
    }

    if (items.length > 500) {
      return NextResponse.json(
        { error: "Too many rows. Maximum 500 holidays allowed per import batch." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let addedCount = 0;
    let updatedCount = 0;
    const errors: { row: number; error: string; data?: any }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowNum = i + 1;

      if (!item.title || !String(item.title).trim()) {
        errors.push({ row: rowNum, error: "Missing or blank holiday title.", data: item });
        continue;
      }

      if (!item.date) {
        errors.push({ row: rowNum, error: "Missing holiday date.", data: item });
        continue;
      }

      // Date parsing
      let parsedDate: Date;
      if (item.date instanceof Date) {
        parsedDate = item.date;
      } else if (typeof item.date === "number") {
        // Excel serial date number conversion (1900 date system)
        parsedDate = new Date((item.date - 25569) * 86400 * 1000);
      } else {
        parsedDate = new Date(String(item.date).trim());
      }

      if (isNaN(parsedDate.getTime())) {
        errors.push({ row: rowNum, error: `Invalid date format: '${item.date}'`, data: item });
        continue;
      }

      const normalizedDate = new Date(
        Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
      );
      const year = normalizedDate.getUTCFullYear();
      const month = normalizedDate.getUTCMonth() + 1;
      const dayOfWeek = DAYS_OF_WEEK[normalizedDate.getUTCDay()];

      // Normalize Type
      let type: "Mandatory" | "Restricted" | "Company" = "Mandatory";
      if (item.type) {
        const matchedType = VALID_TYPES.find((t) => t.toLowerCase() === String(item.type).trim().toLowerCase());
        if (matchedType) type = matchedType;
      }

      // Normalize Category
      let category: "National" | "Religious" | "Cultural" | "Corporate" = "National";
      if (item.category) {
        const matchedCat = VALID_CATEGORIES.find((c) => c.toLowerCase() === String(item.category).trim().toLowerCase());
        if (matchedCat) category = matchedCat;
      }

      // Parse departments
      let depts: string[] = ["All"];
      if (Array.isArray(item.applicableDepartments)) {
        depts = item.applicableDepartments;
      } else if (typeof item.applicableDepartments === "string" && item.applicableDepartments.trim()) {
        depts = item.applicableDepartments.split(",").map((d) => d.trim()).filter(Boolean);
      }

      // Parse locations
      let locs: string[] = [];
      if (Array.isArray(item.locations)) {
        locs = item.locations;
      } else if (typeof item.locations === "string" && item.locations.trim()) {
        locs = item.locations.split(",").map((l) => l.trim()).filter(Boolean);
      }

      const isHalfDay = Boolean(
        item.isHalfDay === true ||
        String(item.isHalfDay).toLowerCase() === "true" ||
        String(item.isHalfDay).toLowerCase() === "yes"
      );

      const existing = await Holiday.findOne({
        tenantId: tenantObjectId,
        date: normalizedDate,
      });

      if (existing) {
        existing.title = String(item.title).trim();
        existing.description = item.description ? String(item.description).trim() : existing.description;
        existing.type = type;
        existing.category = category;
        existing.applicableDepartments = depts;
        existing.locations = locs;
        existing.isHalfDay = isHalfDay;
        existing.year = year;
        existing.month = month;
        existing.dayOfWeek = dayOfWeek;
        await existing.save();
        updatedCount++;
      } else {
        await Holiday.create({
          title: String(item.title).trim(),
          description: item.description ? String(item.description).trim() : "",
          date: normalizedDate,
          year,
          month,
          dayOfWeek,
          type,
          category,
          applicableDepartments: depts,
          locations: locs,
          isHalfDay,
          tenantId: tenantObjectId,
          createdBy: userObjectId,
        });
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete. ${addedCount} added, ${updatedCount} updated.${
        errors.length > 0 ? ` ${errors.length} rows skipped due to invalid formats.` : ""
      }`,
      addedCount,
      updatedCount,
      totalProcessed: items.length,
      errors: errors.slice(0, 20), // return up to 20 errors for user feedback
    });
  } catch (error: any) {
    console.error("POST /api/holidays/import error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
