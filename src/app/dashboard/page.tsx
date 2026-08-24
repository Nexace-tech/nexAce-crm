"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SubAdminDashboard } from "@/components/dashboard/SubAdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { PendingApprovalDashboard } from "@/components/dashboard/PendingApprovalDashboard";
import { Preloader } from "@/components/ui/Preloader";
import { isSubAdminRole } from "@/lib/roles";

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <Preloader label={loading ? "Loading Workspace Dashboard" : "Redirecting to Login..."} />;
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

