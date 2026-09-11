"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SubAdminDashboard } from "@/components/dashboard/SubAdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { PendingApprovalDashboard } from "@/components/dashboard/PendingApprovalDashboard";
import { Preloader } from "@/components/ui/Preloader";
import { AccessRestricted } from "@/components/ui/AccessRestricted";
import { isSubAdminRole } from "@/lib/roles";

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const { canAccessModule, loading: permLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || permLoading) {
    return <Preloader label={loading ? "Loading Workspace Dashboard" : "Redirecting to Login..."} />;
  }

  // Check if user has permission to access the Overview Dashboard module
  if (!canAccessModule("overview")) {
    return <AccessRestricted moduleName="Overview Dashboard" icon="fa-solid fa-chart-simple" />;
  }

  const role = user.role?.toLowerCase();

  // 1. Check if user registration status is Pending
  if (user.status === "Pending") {
    return <PendingApprovalDashboard user={user} />;
  }

  // 2. Separate views based on role (Admin, Manager, HR, Employee)
  if (role === "admin") {
    return <AdminDashboard user={user} />;
  }

  // SubAdmin / OPS role gets dedicated operational dashboard
  if (isSubAdminRole(user.role)) {
    return <SubAdminDashboard user={user} />;
  }

  if (role === "manager") {
    return <ManagerDashboard user={user} />;
  }

  if (role === "hr") {
    return <HRDashboard user={user} />;
  }

  // Default to Employee view
  return <EmployeeDashboard user={user} />;
}

