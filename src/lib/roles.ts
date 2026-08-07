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
 * Returns true when the acting `actorRole` is allowed to set `targetRole`.
 * Only Admin / OPS can assign Admin or OPS; any Manager can assign the rest.
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  const assignable = [...MANAGER_ASSIGNABLE_ROLES, ...SUPER_ROLES] as string[];
  if (!assignable.includes(targetRole)) return false;
  if (SUPER_ROLES.includes(targetRole as Role)) {
    // Only a super-role holder may grant Admin/OPS
    return SUPER_ROLES.includes(actorRole as Role);
  }
  return true;
}
