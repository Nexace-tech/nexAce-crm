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
    return false;
  };

  const canAccessModule = (moduleKey: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (modulePermissions[moduleKey] !== undefined) {
      return Boolean(modulePermissions[moduleKey]);
    }
    if (isSubAdminRole(user.role)) return true;

    // Default fallback access for modules before explicit customization in settings
    const defaultModulesByRole: Record<string, string[]> = {
      Employee: ["overview", "team", "calendar", "projects", "reports", "chat", "hr", "referrals", "settings"],
      HR: ["overview", "team", "calendar", "projects", "reports", "chat", "hr", "goals", "settings"],
      Manager: ["overview", "team", "calendar", "projects", "reports", "chat", "hr", "goals", "sales", "referrals", "settings"],
      OPS: ["overview", "team", "calendar", "projects", "reports", "chat", "hr", "goals", "analytics", "clients", "sales", "finance", "it", "referrals", "settings"],
    };
    const roleKey = normalizeRoleKey(user.role);
    const allowedDefaults = defaultModulesByRole[roleKey] || defaultModulesByRole[user.role] || ["overview", "team", "calendar", "projects", "reports", "chat", "settings"];
    return allowedDefaults.includes(moduleKey);
  };

  return {
    can,
    canAccessModule,
    loading,
    role: user?.role || 'Employee',
    isAdmin,
    isOPS: isSubAdminRole(user?.role),
  };
}
