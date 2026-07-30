"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { PendingApprovalDashboard } from "@/components/dashboard/PendingApprovalDashboard";
import { Preloader } from "@/components/ui/Preloader";

export default function DashboardHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Preloader label="Loading Workspace Dashboard" />;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <Preloader label="Redirecting to Login..." />;
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

  if (role === "manager") {
    return <ManagerDashboard user={user} />;
  }

  if (role === "hr") {
    return <HRDashboard user={user} />;
  }

  // Default to Employee view
  return <EmployeeDashboard user={user} />;
}

