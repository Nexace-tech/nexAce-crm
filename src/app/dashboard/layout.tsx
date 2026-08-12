import { getSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Tenant";
import { DashboardClientLayout } from "@/components/layout/DashboardClientLayout";

import { isSubAdminRole } from "@/lib/roles";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session || !session.userId) {
    redirect("/login");
  }

  // Validate session against database user and load role permissions concurrently
  await connectToDatabase();

  const { RolePermission } = await import("@/models/RolePermission");

  let dbUser = null;
  let permDoc = null;

  try {
    const roleKey = isSubAdminRole(session.role) ? "OPS" : session.role;
    [dbUser, permDoc] = await Promise.all([
      User.findById(session.userId).select("name role tenantId status").populate("tenantId"),
      RolePermission.findOne({
        tenantId: session.tenantId,
        $or: [{ role: session.role }, { role: roleKey }, { role: "OPS" }, { role: "Sub Admin" }],
      }),
    ]);
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

  const isPending = (dbUser as any).status === "Pending";

  const updatedSession = {
    ...session,
    userName,
    role,
    tenantName,
  };

  // Extract custom permissions from already-fetched permDoc
  let customPermissions: any = null;
  if (permDoc && permDoc.modulePermissions) {
    customPermissions = permDoc.modulePermissions;
  }

  // All available sidebar navigation modules
  const allModules = [
    { key: "overview", name: "Overview", href: "/dashboard", icon: "fa-solid fa-chart-simple" },
    { key: "team", name: "My Team", href: "/dashboard/team", icon: "fa-solid fa-users" },
    { key: "calendar", name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
    { key: "projects", name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
    { key: "chat", name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
    { key: "hr", name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
    { key: "goals", name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
    { key: "analytics", name: "Analytics Logs", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
    { key: "clients", name: "Operation Portal", href: "/dashboard/clients", icon: "fa-solid fa-list-check" },
    { key: "it", name: "IT Portal", href: "/dashboard/it", icon: "fa-solid fa-terminal" },
    { key: "referrals", name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
    { key: "settings", name: "Settings & Security", href: "/dashboard/settings", icon: "fa-solid fa-gear" },
  ];

  let menuItems = [];

  if (role === "Admin") {
    menuItems = allModules;
  } else {
    // Dynamic Role-based filtering based on permissions configured by Admin
    menuItems = allModules.filter((mod) => {
      if (customPermissions && customPermissions[mod.key] !== undefined) {
        return customPermissions[mod.key] === true;
      }
      // Fallback defaults
      if (isSubAdminRole(role)) return true; // OPS (SubAdmin) defaults to full operational access
      if (role === "Manager") return mod.key !== "analytics" && mod.key !== "clients" && mod.key !== "it";
      if (role === "HR") return ["overview", "team", "calendar", "projects", "chat", "hr", "goals", "settings"].includes(mod.key);
      // Employee
      return ["overview", "calendar", "projects", "chat", "hr", "referrals", "settings"].includes(mod.key);
    });
  }

  return (
    <DashboardClientLayout session={updatedSession} menuItems={menuItems} isPending={isPending}>
      {children}
    </DashboardClientLayout>
  );
}

