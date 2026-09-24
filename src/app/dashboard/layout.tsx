import { getSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Tenant";
import { DashboardClientLayout } from "@/components/layout/DashboardClientLayout";
import { AuthProvider } from "@/context/AuthContext";
import mongoose from "mongoose";
import { isSubAdminRole } from "@/lib/roles";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession(true);

  if (!session || !session.userId) {
    redirect("/login");
  }

  // Validate session against database user and load role permissions concurrently
  await connectToDatabase();

  const { RolePermission } = await import("@/models/RolePermission");

  let dbUser = null;
  let permDoc = null;
  let dbError = false;

  try {
    const roleKey = isSubAdminRole(session.role) ? "OPS" : session.role;
    const roleOrClauses = isSubAdminRole(session.role)
      ? [{ role: session.role }, { role: "OPS" }, { role: "Sub Admin" }]
      : [{ role: session.role }, { role: roleKey }];
    [dbUser, permDoc] = await Promise.all([
      User.findById(session.userId).select("name role tenantId status").populate("tenantId"),
      RolePermission.findOne({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        $or: roleOrClauses,
      }),
    ]);
  } catch (err) {
    console.error("[DashboardLayout] DB query error:", err);
    dbError = true;
  }

  // Only delete session and redirect if DB connected cleanly and confirmed user does NOT exist
  if (!dbUser && !dbError) {
    await deleteSession();
    redirect("/login");
  }

  // If DB had a transient connection error, don't kill the session! Fall back to session JWT claims
  if (!dbUser && dbError) {
    dbUser = {
      _id: session.userId,
      role: session.role,
      name: session.userName,
      tenantId: { _id: session.tenantId, name: session.tenantName },
      status: "Active",
    } as any;
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
    { key: "clients", name: "OPS Portal", href: "/dashboard/clients", icon: "fa-solid fa-list-check" },
    { key: "bd", name: "BD Portal", href: "/dashboard/bd", icon: "fa-solid fa-briefcase" },
    { key: "finance", name: "Finance Portal", href: "/dashboard/finance", icon: "fa-solid fa-coins" },
    { key: "referrals", name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
    { key: "goals", name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
    { key: "hr", name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-user-tie" },
    { key: "it", name: "IT Portal", href: "/dashboard/it", icon: "fa-solid fa-terminal" },
    { key: "analytics", name: "Analytics Logs", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
    { key: "notifications", name: "Notification Center", href: "/dashboard/notifications", icon: "fa-solid fa-bell" },
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
      if (role === "Manager") return !["analytics", "clients", "it", "finance"].includes(mod.key);
      if (role === "HR") return ["overview", "team", "calendar", "projects", "chat", "hr", "goals", "notifications", "settings"].includes(mod.key);
      // Employee
      return ["overview", "team", "calendar", "projects", "chat", "hr", "referrals", "notifications", "settings"].includes(mod.key);
    });
  }

  return (
    <AuthProvider>
      <DashboardClientLayout session={updatedSession} menuItems={menuItems} isPending={isPending}>
        {children}
      </DashboardClientLayout>
    </AuthProvider>
  );
}

