import { connectToDatabase } from "@/lib/db";
import { RolePermission } from "@/models/RolePermission";
import { DEFAULT_FEATURE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/app/api/settings/permissions/route";
import mongoose from "mongoose";

export interface DataScope {
  role: string;
  scope: "all" | "department" | "own";
  canViewFeature: (featureKey: string) => boolean;
  canViewModule: (moduleKey: string) => boolean;
}

/**
 * Evaluates role & feature permissions for a session user to return their data visibility scope.
 * - Admin / OPS: "all" (Full tenant data access)
 * - Manager: "department" (Access to own department / direct reports)
 * - HR: "all" for team/HR data, "own" for projects/CRM
 * - Employee & Custom Roles: "own" (Personal self-only data access)
 */
export async function getUserDataScope(session: { userId: string; role: string; tenantId: string }): Promise<DataScope> {
  const { role, tenantId } = session;

  if (role === "Admin" || role === "OPS") {
    return {
      role,
      scope: "all",
      canViewFeature: () => true,
      canViewModule: () => true,
    };
  }

  await connectToDatabase();

  const permDoc = await RolePermission.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    role,
  }).lean();

  const modulePerms = {
    ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Employee),
    ...(permDoc?.modulePermissions || {}),
  };

  const featurePerms = {
    ...(DEFAULT_FEATURE_PERMISSIONS[role] || DEFAULT_FEATURE_PERMISSIONS.Employee),
    ...(permDoc?.featurePermissions || {}),
  };

  const canViewFeature = (featureKey: string) => featurePerms[featureKey] ?? false;
  const canViewModule = (moduleKey: string) => modulePerms[moduleKey] ?? false;

  let scope: "all" | "department" | "own" = "own";

  if (role === "Manager") {
    scope = canViewFeature("viewTeamDirectory") || canViewFeature("viewTeamTimesheets") ? "department" : "own";
  } else if (role === "HR") {
    scope = canViewFeature("viewTeamDirectory") ? "all" : "own";
  } else {
    if (canViewFeature("viewTeamDirectory") || canViewFeature("viewAllReferrals")) {
      scope = "all";
    } else if (canViewFeature("viewTeamTimesheets") || canViewFeature("viewTeamLeave")) {
      scope = "department";
    } else {
      scope = "own";
    }
  }

  return {
    role,
    scope,
    canViewFeature,
    canViewModule,
  };
}
