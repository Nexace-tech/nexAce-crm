import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { isSubAdminRole } from "@/lib/roles";

export interface HRAccessScope {
  isIsolated: boolean;
  isPrivilegedAdmin: boolean;
  isHR: boolean;
  allowedUserIds?: mongoose.Types.ObjectId[];
}

/**
 * Determines data visibility for HR, Managers, Employees, and Admins.
 * When `isolateHRData` is enabled on the Tenant:
 * - Admin/OPS: Sees everyone.
 * - HR: Only sees users assigned to them (`hrId == currentHR`) + themselves (`_id == currentHR`).
 * - Other HRs and unassigned / other HRs' employees are hidden.
 * When `isolateHRData` is disabled:
 * - HR has company-wide visibility.
 */
export async function getHRAccessScope(
  session: { role: string; userId: string },
  tenantObjectId: mongoose.Types.ObjectId,
  userObjectId: mongoose.Types.ObjectId
): Promise<HRAccessScope> {
  const isPrivilegedAdmin =
    session.role === "Admin" ||
    session.role === "OPS" ||
    isSubAdminRole(session.role);

  if (isPrivilegedAdmin) {
    return { isIsolated: false, isPrivilegedAdmin: true, isHR: false };
  }

  const tenant = await Tenant.findById(tenantObjectId).select("isolateHRData").lean();
  const isIsolated = Boolean(tenant?.isolateHRData);

  if (session.role === "HR") {
    if (isIsolated) {
      // Get all employees assigned to this HR partner + the HR themselves
      const assignedUsers = await User.find({
        tenantId: tenantObjectId,
        $or: [{ hrId: userObjectId }, { _id: userObjectId }],
      })
        .select("_id")
        .lean();

      const allowedUserIds = assignedUsers.map((u) => u._id as mongoose.Types.ObjectId);
      return { isIsolated: true, isPrivilegedAdmin: false, isHR: true, allowedUserIds };
    }

    return { isIsolated: false, isPrivilegedAdmin: false, isHR: true };
  }

  if (session.role === "Manager") {
    const teamUsers = await User.find({
      tenantId: tenantObjectId,
      $or: [{ managerId: userObjectId }, { _id: userObjectId }],
    })
      .select("_id")
      .lean();

    return {
      isIsolated: false,
      isPrivilegedAdmin: false,
      isHR: false,
      allowedUserIds: teamUsers.map((u) => u._id as mongoose.Types.ObjectId),
    };
  }

  // Standard employee: sees only own data
  return {
    isIsolated: false,
    isPrivilegedAdmin: false,
    isHR: false,
    allowedUserIds: [userObjectId],
  };
}
