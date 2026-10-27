'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isSubAdminRole, normalizeRoleKey } from '@/lib/roles';

export function usePermissions() {
  const { user } = useAuth();
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>({});
  const [featurePermissions, setFeaturePermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Case-insensitive Admin check (handles 'Admin', 'admin', ' ADMIN ', etc.)
  const isAdmin = Boolean(
    user?.role && user.role.trim().toLowerCase() === 'admin'
  );

  useEffect(() => {
    async function loadPermissions() {
      if (!user) return;

      // Root Admin has absolute full access by default
      if (isAdmin) {
        setLoading(false);
        return;
      }

      // Pending users only see Under Approval holding screen, no need to fetch permissions
      if (user.status === "Pending") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch('/api/settings/permissions');
        if (res.ok) {
          const data = await res.json();
          const roleKey = normalizeRoleKey(user.role);

          const roleModulePerms =
            data.permissions?.[roleKey] ||
            data.permissions?.[user.role] ||
            {};
          const roleFeaturePerms =
            data.featurePermissions?.[roleKey] ||
            data.featurePermissions?.[user.role] ||
            {};

          setModulePermissions(roleModulePerms);
          setFeaturePermissions(roleFeaturePerms);
        }
      } catch (err) {
        console.error('Error loading user permissions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();

    if (typeof window !== "undefined") {
      window.addEventListener("permissions-updated", loadPermissions);
      return () => window.removeEventListener("permissions-updated", loadPermissions);
    }
  }, [user, isAdmin]);

  const can = (featureKey: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    // Dynamic tenant-configured feature permission takes absolute precedence
    if (featurePermissions[featureKey] !== undefined) {
      return Boolean(featurePermissions[featureKey]);
    }
    // Default super-sensitive administrative features to false for SubAdmin / OPS unless explicitly granted
    if ([
      "changeUserRoles",
      "manageRolePermissions",
      "resetUserPasswords",
      "manageFileRestrictions",
      "manageIntegrations"
    ].includes(featureKey)) {
      return false;
    }
    if (isSubAdminRole(user.role)) return true;
    if (user.role === "HR" && (
      featureKey === "manageHolidays" || 
      featureKey === "importHolidayExcel" ||
      featureKey === "manageLeaveBalances" ||
      featureKey === "managePayroll" ||
      featureKey === "approveRegularization"
    )) {
      return true;
    }
    return false;
  };

  const canAccessModule = (moduleKey: string): boolean => {
    if (!user) return false;
    // Root Admin always has full, unconditional access to every module
    if (isAdmin) return true;

    // 1. Dynamic check: if tenant configured this module permission explicitly for the role, respect it
    if (modulePermissions[moduleKey] !== undefined) {
      return Boolean(modulePermissions[moduleKey]);
    }

    // 2. IT Portal: accessible if module permission "it" or any IT feature permission is granted
    if (moduleKey === "it") {
      if (
        featurePermissions["viewITPortal"] === true ||
        featurePermissions["manageITDevices"] === true ||
        featurePermissions["manageITAccess"] === true ||
        featurePermissions["manageITSubscriptions"] === true ||
        featurePermissions["manageITInvoices"] === true
      ) {
        return true;
      }
    }

    // 3. OPS Portal (/dashboard/clients): only accessible to Admin, OPS or if explicitly granted
    if (moduleKey === "clients") {
      if (isSubAdminRole(user.role)) return true;
      return false;
    }

    if (isSubAdminRole(user.role)) return true;

    // 4. Default fallback access for modules before explicit customization in settings
    const defaultModulesByRole: Record<string, string[]> = {
      Employee: ["overview", "team", "calendar", "projects", "chat", "notifications", "goals", "finance", "drive"],
      HR: ["overview", "team", "calendar", "projects", "chat", "notifications", "goals", "hr", "finance", "drive"],
      Manager: ["overview", "team", "calendar", "projects", "chat", "notifications", "bd", "referrals", "goals", "finance", "drive"],
      OPS: ["overview", "team", "calendar", "projects", "clients", "bd", "finance", "referrals", "goals", "hr", "it", "analytics", "settings", "drive"],
    };
    const roleKey = normalizeRoleKey(user.role);
    const allowedDefaults = defaultModulesByRole[roleKey] || defaultModulesByRole[user.role] || ["overview", "team", "calendar", "projects", "chat", "notifications", "finance", "drive"];
    return allowedDefaults.includes(moduleKey);
  };

  return {
    can,
    canAccessModule,
    loading,
    role: user?.role || 'Employee',
    isAdmin,
    isOPS: isSubAdminRole(user?.role),
    isHR: user?.role === "HR" || (Boolean(user?.role) && user!.role.trim().toLowerCase() === "hr"),
  };
}
