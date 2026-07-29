import { getSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Tenant";
import { DashboardClientLayout } from "@/components/layout/DashboardClientLayout";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session || !session.userId) {
    redirect("/login");
  }

  // Validate session against database user to prevent stale cookie desync
  await connectToDatabase();
  let dbUser = null;
  try {
    dbUser = await User.findById(session.userId).select("name role tenantId").populate("tenantId");
  } catch {
    dbUser = null;
  }

  if (!dbUser) {
    await deleteSession();
    redirect("/login");
  }

  const role = dbUser.role || session.role;
  const userName = dbUser.name || session.userName;
  const tenantName = (dbUser.tenantId as any)?.name || session.tenantName || "Workspace";

  const updatedSession = {
    ...session,
    userName,
    role,
    tenantName,
  };

  // Role-aware navigation menu items for Admin, Manager, and Employee
  let menuItems = [];

  if (role === "Admin") {
    menuItems = [
      { name: "Overview", href: "/dashboard", icon: "fa-solid fa-chart-simple" },
      { name: "My Team", href: "/dashboard/team", icon: "fa-solid fa-users" },
      { name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
      { name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
      { name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
      { name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
      { name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
      { name: "Analytics Logs", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
      { name: "CRM Retainers", href: "/dashboard/clients", icon: "fa-solid fa-handshake" },
      { name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
      { name: "Settings & Security", href: "/dashboard/settings", icon: "fa-solid fa-gear" },
    ];
  } else if (role === "Manager") {
    menuItems = [
      { name: "Overview", href: "/dashboard", icon: "fa-solid fa-chart-simple" },
      { name: "My Team", href: "/dashboard/team", icon: "fa-solid fa-users" },
      { name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
      { name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
      { name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
      { name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
      { name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
      { name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
      { name: "Settings & Security", href: "/dashboard/settings", icon: "fa-solid fa-gear" },
    ];
  } else {
    // Employee
    menuItems = [
      { name: "Overview", href: "/dashboard", icon: "fa-solid fa-chart-simple" },
      { name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
      { name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
      { name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
      { name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
      { name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
      { name: "Settings & Security", href: "/dashboard/settings", icon: "fa-solid fa-gear" },
    ];
  }

  return (
    <DashboardClientLayout session={updatedSession} menuItems={menuItems}>
      {children}
    </DashboardClientLayout>
  );
}

