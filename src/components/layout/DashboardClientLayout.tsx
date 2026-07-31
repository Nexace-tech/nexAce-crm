"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ZoomControl } from "@/components/layout/ZoomControl";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GuidedTour } from "@/components/guided-tour/GuidedTour";
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
  const { user } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userName = user?.name || session.userName;
  const role = user?.role || session.role;
  const tenantName = (user?.tenantId as any)?.name || session.tenantName;

  const initials = userName
    ? userName
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
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 lg:static lg:h-screen lg:sticky lg:top-0",
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-72"
        )}
      >
        {/* Brand Header */}
        <div className={cn("flex items-center justify-between h-16 border-b border-border transition-all", sidebarCollapsed ? "px-3 justify-center" : "px-6")}>
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-lg tracking-tight overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30 shrink-0">
              <i className="fa-solid fa-sparkles text-base" />
            </div>
            {!sidebarCollapsed && (
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent font-bold truncate">
                NexAce CRM
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {/* Collapse / Expand toggle button (desktop only) */}
            <button
              className="hidden lg:flex text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <i className="fa-solid fa-chevron-right text-xs" /> : <i className="fa-solid fa-chevron-left text-xs" />}
            </button>
            {/* Close sidebar button (mobile only) */}
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-md"
              onClick={() => setMobileOpen(false)}
              aria-label="Close Sidebar"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const iconClass = fontAwesomeIconMap[item.name] || item.icon || "fa-solid fa-layer-group";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  sidebarCollapsed && "justify-center px-0"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <i className={cn(iconClass, "text-base transition-transform group-hover:scale-110 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* User Footer Profile Card */}
        <div className={cn("border-t border-border bg-card/50", sidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center rounded-lg bg-accent/50 border border-border/50", sidebarCollapsed ? "justify-center p-2" : "gap-3 p-2")}>
            <Avatar className="h-9 w-9 shrink-0 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {session.userName ? session.userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{session.userName}</p>
                <span className="text-[10px] text-muted-foreground font-medium truncate">{session.role} • {tenantName}</span>
              </div>
            )}
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
              <i className="fa-solid fa-bars text-base" />
            </button>

            {/* Global Search Bar (Triggers Command Palette) */}
            <div
              className="relative w-full cursor-pointer"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <input
                type="text"
                readOnly
                placeholder="Search command palette... (e.g. OKRs, Referrals, Timesheets)"
                className="w-full pl-9 pr-14 py-2 text-sm bg-muted/60 dark:bg-slate-800/80 hover:bg-muted/80 dark:hover:bg-slate-800 border border-border/80 dark:border-slate-700/80 rounded-lg focus:outline-none transition-all placeholder:text-muted-foreground shadow-xs cursor-pointer"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded shadow-2xs">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-semibold cursor-pointer border border-primary/20"
              title="Start Guided Product Tour"
            >
              <i className="fa-solid fa-compass text-sm animate-spin-slow text-primary" />
              <span className="hidden sm:inline">Tour</span>
            </button>

            <ZoomControl />
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-slate-800/80 border border-border/80 dark:border-slate-700/80 rounded-lg p-0.5 shadow-xs">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <div className="h-6 w-px bg-border/60 mx-1" />
            <LogoutHeaderBtn />
          </div>
        </header>

        {/* Guided Product Tour Modal */}
        <GuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} role={role} />

        {/* Command Palette Modal */}
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

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
