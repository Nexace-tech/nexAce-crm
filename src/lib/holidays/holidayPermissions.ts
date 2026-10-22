import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * Check if the current user session has permission to manage (create, edit, delete, seed) company holidays.
 * Dynamic: reads from RolePermission in DB if configured, otherwise falls back to role defaults (Admin, OPS, HR = true).
 */
export async function canUserManageHolidays(
  session: any,
  tenantObjectId: mongoose.Types.ObjectId
): Promise<boolean> {
  if (!session) return false;
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
    if (session.role === "HR") return true;
  } catch (err) {
    console.error("Error checking manageHolidays permission:", err);
  }
  return false;
}

/**
 * Check if the current user session has permission to import holidays via Excel/CSV.
 */
export async function canUserImportHolidays(
  session: any,
  tenantObjectId: mongoose.Types.ObjectId
): Promise<boolean> {
  if (!session) return false;
  if (session.role?.toLowerCase() === "admin") return true;
  if (isSubAdminRole(session.role)) return true;

  try {
    const { RolePermission } = await import("@/models/RolePermission");
    const roleKey = isSubAdminRole(session.role) ? "OPS" : session.role;
    const permDoc = await RolePermission.findOne({
      tenantId: tenantObjectId,
      $or: [{ role: session.role }, { role: roleKey }],
    }).lean();

    if (permDoc?.featurePermissions?.importHolidayExcel !== undefined) {
      return Boolean(permDoc.featurePermissions.importHolidayExcel);
    }
    if (permDoc?.featurePermissions?.manageHolidays !== undefined) {
      return Boolean(permDoc.featurePermissions.manageHolidays);
    }
    if (session.role === "HR") return true;
  } catch (err) {
    console.error("Error checking importHolidayExcel permission:", err);
  }
  return false;
}
