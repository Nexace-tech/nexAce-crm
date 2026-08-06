'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function usePermissions() {
  const { user } = useAuth();
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>({});
  const [featurePermissions, setFeaturePermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (!user) return;
      // Admin and OPS have full access by default
      if (user.role === 'Admin' || user.role === 'OPS') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch('/api/settings/permissions');
        if (res.ok) {
          const data = await res.json();
          const userRole = user.role;
          setModulePermissions(data.permissions?.[userRole] || {});
          setFeaturePermissions(data.featurePermissions?.[userRole] || {});
        }
      } catch (err) {
        console.error('Error loading user permissions:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [user]);

  const can = (featureKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'OPS') return true;
    return featurePermissions[featureKey] ?? false;
  };

  const canAccessModule = (moduleKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'OPS') return true;
    return modulePermissions[moduleKey] ?? true;
  };

  return {
    can,
    canAccessModule,
    loading,
    role: user?.role || 'Employee',
    isAdmin: user?.role === 'Admin',
    isOPS: user?.role === 'OPS',  // OPS is sub-admin; Admin is separate
  };
}
