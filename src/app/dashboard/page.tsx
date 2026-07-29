"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { PendingApprovalDashboard } from "@/components/dashboard/PendingApprovalDashboard";

export default function DashboardHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading Workspace Dashboard...
      </div>
    );
  }

  // 1. Check if user registration status is Pending
  if (user?.status === "Pending") {
    return <PendingApprovalDashboard user={user} />;
  }

  // 2. Separate views based on role (Admin, Manager, Employee)
  if (user?.role === "Admin") {
    return <AdminDashboard user={user} />;
  }

  if (user?.role === "Manager") {
    return <ManagerDashboard user={user} />;
  }

  // Default to Employee view
  return <EmployeeDashboard user={user} />;
}
