import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { DashboardClientLayout } from "@/components/layout/DashboardClientLayout";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const menuItems = [
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
  ];

  return (
    <DashboardClientLayout session={session} menuItems={menuItems}>
      {children}
    </DashboardClientLayout>
  );
}
