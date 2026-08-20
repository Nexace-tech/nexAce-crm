import { connectToDatabase } from "@/lib/db";
import { RolePermission } from "@/models/RolePermission";
import { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/app/api/settings/permissions/route";
import { isSubAdminRole, normalizeRoleKey } from "@/lib/roles";
import mongoose from "mongoose";

export interface DataScope {
  role: string;
  scope: "all" | "department" | "own";
  canViewFeature: (featureKey: string) => boolean;
  canViewModule: (moduleKey: string) => boolean;
}

/**
 * Evaluates role & feature permissions dynamically for ANY role (Admin, OPS, Manager, HR, Employee, Custom Roles).
 * - Admin: "all" (Root tenant super admin, non-overrideable, case-insensitive)
 * - All other roles: Dynamically respects configured feature & module toggles saved in RolePermission doc in DB!
 */
export async function getUserDataScope(session: { userId: string; role: string; tenantId: string }): Promise<DataScope> {
  const { role, tenantId } = session;
  const isAdmin = Boolean(role && role.trim().toLowerCase() === "admin");

  // Root Admin always has full unrestricted access
  if (isAdmin) {
    return {
      role,
      scope: "all",
      canViewFeature: () => true,
      canViewModule: () => true,
    };
  }

  await connectToDatabase();

  const roleKey = normalizeRoleKey(role);

  // Find RolePermission for exact role name or canonical key
  const roleOrClauses = isSubAdminRole(role)
    ? [{ role }, { role: roleKey }, { role: "OPS" }, { role: "Sub Admin" }]
    : [{ role }, { role: roleKey }];
  const permDoc = await RolePermission.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    $or: roleOrClauses,
  }).lean();

  const modulePerms = {
    ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS.Employee),
    ...(permDoc?.modulePermissions || {}),
  };

  const featurePerms = {
    ...(DEFAULT_FEATURE_PERMISSIONS[roleKey] || DEFAULT_FEATURE_PERMISSIONS.Employee),
    ...(permDoc?.featurePermissions || {}),
  };

  const canViewFeature = (featureKey: string) => {
    if (featurePerms[featureKey] !== undefined) return Boolean(featurePerms[featureKey]);
    if (["manageUsers", "changeUserRoles", "manageRolePermissions", "resetUserPasswords", "viewBillingSubscription", "manageBilling", "manageShifts"].includes(featureKey)) {
      return false;
    }
    return isSubAdminRole(role) ? true : false;
  };

  const canViewModule = (moduleKey: string) => {
    if (modulePerms[moduleKey] !== undefined) return Boolean(modulePerms[moduleKey]);
    return isSubAdminRole(role) ? true : false;
  };

  // Dynamic scope calculation based on granted feature permissions:
  let scope: "all" | "department" | "own" = "own";

  if (canViewFeature("manageUsers") || canViewFeature("viewAnalyticsDashboard") || canViewFeature("viewClients") || (isSubAdminRole(role) && canViewFeature("viewTeamDirectory")) || role === "HR" || role === "Admin") {
    scope = "all";
  } else if (canViewFeature("viewTeamDirectory") || canViewFeature("viewTeamTimesheets") || canViewFeature("viewTeamLeave") || canViewFeature("reviewTeamAppraisals") || role === "Manager") {
    scope = "department";
  } else {
    scope = "own";
  }

  return {
    role,
    scope,
    canViewFeature,
    canViewModule,
  };
}
