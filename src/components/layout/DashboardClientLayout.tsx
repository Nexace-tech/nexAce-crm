"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ZoomControl } from "@/components/layout/ZoomControl";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GuidedTour } from "@/components/guided-tour/GuidedTour";
import { ProfileCompletionBanner } from "@/components/layout/ProfileCompletionBanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  isPending?: boolean;
  children: React.ReactNode;
}

const hrefToModuleKeyMap: Record<string, string> = {
  "/dashboard": "overview",
  "/dashboard/team": "team",
  "/dashboard/calendar": "calendar",
  "/dashboard/projects": "projects",
  "/dashboard/chat": "chat",
  "/dashboard/hr": "hr",
  "/dashboard/goals": "goals",
  "/dashboard/analytics": "analytics",
  "/dashboard/clients": "clients",
  "/dashboard/it": "it",
  "/dashboard/referrals": "referrals",
  "/dashboard/settings": "settings",
};


export function DashboardClientLayout({ session, menuItems, isPending = false, children }: DashboardClientLayoutProps) {
  const { user } = useAuthContext();
  const { canAccessModule } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

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

  useEffect(() => {
    if (user?.status === "Pending" && pathname !== "/dashboard") {
      window.location.href = "/dashboard";
    }
  }, [user?.status, pathname]);

  const userName = user?.name || session.userName;
  const role = user?.role || session.role;
  const tenantName = (user?.tenantId as any)?.name || session.tenantName;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dashboard Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-card/95 backdrop-blur-md transition-all duration-300 w-72 max-w-[85vw] lg:static lg:h-screen lg:sticky lg:top-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-72"
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "flex items-center justify-between h-16 border-b border-border transition-all px-4 sm:px-6",
            sidebarCollapsed && "lg:px-3 lg:justify-center"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 font-semibold text-lg tracking-tight overflow-hidden"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30 shrink-0">
              <i className="fa-solid fa-wand-magic-sparkles text-base" />
            </div>
            <span
              className={cn(
                "bg-gradient-to-r from-teal-400 via-[#30b8bd] to-cyan-300 bg-clip-text text-transparent font-bold truncate",
                sidebarCollapsed && "lg:hidden"
              )}
            >
              NexAce CRM
            </span>
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
              className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent/80 transition-colors cursor-pointer"
              onClick={() => setMobileOpen(false)}
              aria-label="Close Sidebar"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {menuItems
            .filter((item) => {
              const modKey = hrefToModuleKeyMap[item.href];
              return modKey ? canAccessModule(modKey) : true;
            })
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const iconClass = item.icon || "fa-solid fa-layer-group";
              const isDisabled = isPending && item.href !== "/dashboard";

              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    title={sidebarCollapsed ? item.name : "Locked until account is approved"}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium relative select-none opacity-40 cursor-not-allowed",
                      sidebarCollapsed && "lg:justify-center lg:px-0"
                    )}
                  >
                    <i className={cn(iconClass, "text-base shrink-0 text-muted-foreground")} />
                    <span className={cn("truncate text-muted-foreground", sidebarCollapsed && "lg:hidden")}>
                      {item.name}
                    </span>
                    <i className={cn("fa-solid fa-lock text-[10px] ml-auto text-muted-foreground/60", sidebarCollapsed && "lg:hidden")} />
                  </div>
                );
              }

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
                    sidebarCollapsed && "lg:justify-center lg:px-0"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <i
                    className={cn(
                      iconClass,
                      "text-base transition-transform group-hover:scale-110 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className={cn("truncate", sidebarCollapsed && "lg:hidden")}>{item.name}</span>
                </Link>
              );
            })}
        </div>

        {/* Mobile Quick Utility Controls inside Sidebar */}
        <div className="lg:hidden px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <i className="fa-solid fa-sliders text-xs text-primary" /> Controls
          </span>
          <div className="flex items-center gap-1 bg-card dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg p-0.5 shadow-xs">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        {/* User Footer Profile Card */}
        <div className={cn("border-t border-border bg-card/50 p-3 sm:p-4", sidebarCollapsed && "lg:p-2")}>
          <Link
            href="/dashboard/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center rounded-xl bg-accent/50 hover:bg-accent/80 border border-border/50 transition-all duration-200 group relative cursor-pointer gap-3 p-2.5",
              sidebarCollapsed && "lg:justify-center lg:p-2"
            )}
            title={sidebarCollapsed ? `${userName} (${role}) - Manage Profile` : "Manage Profile & Settings"}
          >
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
              {user?.photoUrl ? (
                <AvatarImage src={user.photoUrl} alt={userName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {userName ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex flex-col min-w-0 flex-1", sidebarCollapsed && "lg:hidden")}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{userName}</p>
                <i className="fa-solid fa-gear text-[10px] text-muted-foreground group-hover:text-primary transition-colors ml-1 opacity-0 group-hover:opacity-100" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium truncate">{role} • {tenantName}</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent/80 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              onClick={() => setMobileOpen(true)}
              aria-label="Open Mobile Menu"
            >
              <i className="fa-solid fa-bars text-lg" />
            </button>

            {/* Desktop Expand Button when collapsed */}
            {sidebarCollapsed && (
              <button
                type="button"
                className="hidden lg:flex text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent/80 transition-colors items-center justify-center shrink-0 cursor-pointer"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand Sidebar"
                title="Expand Sidebar"
              >
                <i className="fa-solid fa-bars text-base" />
              </button>
            )}

            {/* Global Search Bar (Triggers Command Palette) */}
            <div
              className="relative w-full cursor-pointer min-w-0"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <input
                type="text"
                readOnly
                placeholder="Search..."
                className="w-full pl-9 pr-3 sm:pr-14 py-2 text-sm bg-muted/60 dark:bg-slate-800/80 hover:bg-muted/80 dark:hover:bg-slate-800 border border-border/80 dark:border-slate-700/80 rounded-lg focus:outline-none transition-all placeholder:text-muted-foreground shadow-xs cursor-pointer truncate"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded shadow-2xs">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-semibold cursor-pointer border border-primary/20"
              title="Start Guided Product Tour"
            >
              <i className="fa-solid fa-compass text-sm animate-spin-slow text-primary" />
              <span>Tour</span>
            </button>

            <div className="hidden md:flex">
              <ZoomControl />
            </div>

            {/* Desktop Theme & Notifications (Hidden on small mobile screens, available inside drawer) */}
            <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 bg-muted/60 dark:bg-slate-800/80 border border-border/80 dark:border-slate-700/80 rounded-lg p-0.5 shadow-xs">
              <ThemeToggle />
              <NotificationBell />
            </div>

            <div className="hidden sm:block h-6 w-px bg-border/60 mx-0.5" />
            <LogoutHeaderBtn />
          </div>
        </header>

        {/* Guided Product Tour Modal */}
        <GuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} role={role} />

        {/* Command Palette Modal */}
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <ProfileCompletionBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
