/**
 * Shared role constants for the NexAce CRM platform.
 * Use these constants everywhere instead of raw string literals.
 */

export const ROLES = {
  Admin: "Admin",
  OPS: "OPS",
  Manager: "Manager",
  HR: "HR",
  Employee: "Employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles that have full, unrestricted access to all data and modules. */
export const SUPER_ROLES: Role[] = [ROLES.Admin, ROLES.OPS];

/** All valid role values for schema enum validation. */
export const ALL_ROLES: Role[] = Object.values(ROLES);

/**
 * Roles a Manager is permitted to assign to other users.
 * Managers must never be able to grant Admin/OPS (privilege escalation guard).
 */
export const MANAGER_ASSIGNABLE_ROLES: Role[] = [ROLES.Manager, ROLES.HR, ROLES.Employee];

/**
 * Helper to check if a role is SubAdmin / OPS (accepting 'OPS', 'Sub Admin', 'SubAdmin', etc.).
 */
export function isSubAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === "ops" ||
    normalized === "sub admin" ||
    normalized === "subadmin" ||
    normalized === "sub-admin" ||
    normalized.includes("sub admin") ||
    normalized.includes("subadmin")
  );
}

/**
 * Helper to normalize any role variation to its standard canonical key.
 * (e.g. 'Sub Admin' -> 'OPS', 'admin' -> 'Admin')
 */
export function normalizeRoleKey(role?: string | null): string {
  if (!role) return "Employee";
  if (isSubAdminRole(role)) return "OPS";
  if (role.trim().toLowerCase() === "admin") return "Admin";
  return role.trim();
}

/**
 * Returns true when the acting `actorRole` is allowed to set `targetRole`.
 * Only Admin / OPS can assign Admin or OPS; any Manager can assign the rest.
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "Admin" || isSubAdminRole(actorRole)) return true;
  if (isSubAdminRole(targetRole) || targetRole === "Admin") return false;
  return true;
}
