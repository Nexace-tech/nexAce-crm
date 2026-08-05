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
