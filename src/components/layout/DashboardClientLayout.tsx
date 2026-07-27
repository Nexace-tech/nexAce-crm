"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FolderGit2, 
  MessageSquare, 
  Briefcase, 
  Target, 
  BarChart3, 
  Handshake, 
  Share2, 
  Search, 
  Menu, 
  X, 
  Sparkles,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ZoomControl } from "@/components/layout/ZoomControl";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

interface DashboardClientLayoutProps {
  session: {
    userName: string;
    role: string;
    tenantName: string;
  };
  menuItems: MenuItem[];
  children: React.ReactNode;
}

// Map menu names to FontAwesome icons or use item.icon directly
const fontAwesomeIconMap: Record<string, string> = {
  "Overview": "fa-solid fa-chart-simple",
  "My Team": "fa-solid fa-users",
  "Calendar & Timesheets": "fa-solid fa-calendar-days",
  "Projects & Drive": "fa-solid fa-folder-tree",
  "Chat & Mail": "fa-solid fa-comments",
  "HR Portal": "fa-solid fa-briefcase",
  "Goals & OKRs": "fa-solid fa-bullseye",
  "Analytics Logs": "fa-solid fa-chart-line",
  "CRM Retainers": "fa-solid fa-handshake",
  "Referral Pipeline": "fa-solid fa-link",
  "Settings & Security": "fa-solid fa-gear",
};

export function DashboardClientLayout({ session, menuItems, children }: DashboardClientLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const initials = session.userName
    ? session.userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Dashcode Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 lg:static lg:h-screen lg:sticky lg:top-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed 
            ? "lg:-translate-x-full lg:w-0 lg:min-w-0 lg:border-r-0 lg:overflow-hidden lg:p-0" 
            : "lg:translate-x-0 lg:w-72"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg tracking-tight">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent font-bold">
              NexAce CRM
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {/* Collapse sidebar button (desktop only) */}
            <button
              className="hidden lg:flex text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse Sidebar"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Close sidebar button (mobile only) */}
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-md"
              onClick={() => setMobileOpen(false)}
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tenant Switcher Label */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</span>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md truncate max-w-[140px]">
            {session.tenantName}
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const faClass = item.icon || fontAwesomeIconMap[item.name] || "fa-solid fa-chart-simple";
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span className={cn("w-5 text-center text-base transition-transform group-hover:scale-110 flex items-center justify-center", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                  <i className={faClass} />
                </span>
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/50 border border-border/50">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground leading-none">{session.userName}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1 truncate">{session.role}</p>
            </div>
            <Link
              href="/dashboard/settings"
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-background transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button
              className={cn(
                "text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent",
                !sidebarCollapsed && "lg:hidden"
              )}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setSidebarCollapsed(false);
                }
              }}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Open Sidebar"}
              title={sidebarCollapsed ? "Expand Sidebar" : "Open Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search team, projects, tasks..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted/60 dark:bg-slate-800/80 hover:bg-muted/80 dark:hover:bg-slate-800 border border-border/80 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background dark:focus:bg-slate-900 transition-all placeholder:text-muted-foreground shadow-xs"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <ZoomControl />
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-slate-800/80 border border-border/80 dark:border-slate-700/80 rounded-lg p-0.5 shadow-xs">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <div className="h-6 w-px bg-border/60 mx-1" />
            <LogoutHeaderBtn />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
