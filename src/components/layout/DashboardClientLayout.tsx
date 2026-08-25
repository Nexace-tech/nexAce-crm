"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GuidedTour } from "@/components/guided-tour/GuidedTour";
import { ProfileCompletionBanner } from "@/components/layout/ProfileCompletionBanner";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  key?: string;
  badge?: string;
  badgeColor?: string;
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

// ── Feature Groups Configuration (Only Real Functional Features) ───────────────
const featureSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "Main Menu",
    items: [
      { key: "overview", name: "Dashboard", href: "/dashboard", icon: "fa-solid fa-gauge-high" },
      { key: "team", name: "My Team", href: "/dashboard/team", icon: "fa-solid fa-users" },
      { key: "calendar", name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
      { key: "projects", name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
      { key: "chat", name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
    ],
  },
  {
    title: "Operations & CRM",
    items: [
      { key: "clients", name: "Operation Portal", href: "/dashboard/clients", icon: "fa-solid fa-list-check" },
      { key: "referrals", name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
      { key: "goals", name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
    ],
  },
  {
    title: "Management & HR",
    items: [
      { key: "hr", name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
      { key: "it", name: "IT Portal", href: "/dashboard/it", icon: "fa-solid fa-terminal" },
      { key: "analytics", name: "Analytics Logs", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
      { key: "settings", name: "Settings & Security", href: "/dashboard/settings", icon: "fa-solid fa-gear" },
    ],
  },
];

export function DashboardClientLayout({ session, menuItems, isPending = false, children }: DashboardClientLayoutProps) {
  const { user } = useAuthContext();
  const { canAccessModule } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const userName = user?.name || session.userName;
  const role = user?.role || session.role;
  const tenantName = (user?.tenantId as any)?.name || session.tenantName;

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#11161d] text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR DRAWER (Holds all controls & navigation)                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <aside className={cn(
        "fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#161c24] border-r border-slate-200 dark:border-[#232d3b] flex flex-col overflow-y-auto transition-transform duration-300 shadow-xl lg:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-[#232d3b] shrink-0">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 no-underline">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-[#00c5a0] to-[#0ea5e9] flex items-center justify-center shadow-md shadow-[#00c5a0]/20">
              <i className="fa-solid fa-layer-group text-slate-950 text-sm font-black" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
              NexAce <span className="text-[#00c5a0]">CRM</span>
            </span>
          </Link>
          {/* Close for mobile */}
          <button
            className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e2632] cursor-pointer"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* ── Quick Tools Bar inside Mobile Menu Drawer (Hidden on Desktop) ── */}
        <div className="lg:hidden p-3 border-b border-slate-200 dark:border-[#232d3b] bg-slate-50/50 dark:bg-[#11161d]/50 shrink-0 space-y-2">
          {/* Search Trigger */}
          <button
            onClick={() => { setMobileOpen(false); setCommandPaletteOpen(true); }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg text-slate-500 dark:text-slate-400 hover:border-[#00c5a0] transition-colors cursor-pointer shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-magnifying-glass text-[#00c5a0]" />
              <span>Quick Search...</span>
            </span>
            <kbd className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-[#1e2632] border border-slate-200 dark:border-[#232d3b] rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </button>

          {/* Quick Utility Actions Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {/* Theme Toggle Button */}
            <div className="flex-1 flex items-center justify-center h-8 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-2xs">
              <ThemeToggle />
            </div>

            {/* Notifications Bell Button */}
            <div className="flex-1 flex items-center justify-center h-8 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-2xs">
              <NotificationBell />
            </div>

            {/* Product Tour Trigger */}
            <button
              onClick={() => { setMobileOpen(false); setTourOpen(true); }}
              className="flex-1 flex items-center justify-center h-8 bg-white dark:bg-[#161c24] border border-[#00c5a0]/30 rounded-lg text-[#00c5a0] hover:bg-[#00c5a0]/15 transition-colors cursor-pointer shadow-2xs text-xs font-semibold gap-1"
              title="Product Tour"
            >
              <i className="fa-solid fa-compass text-xs" />
              <span className="text-[11px]">Tour</span>
            </button>
          </div>
        </div>

        {/* Real Features Navigation */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
          {featureSections.map((sec) => {
            const allowedInSec = sec.items.filter((item) => !item.key || canAccessModule(item.key));
            if (allowedInSec.length === 0) return null;

            return (
              <div key={sec.title}>
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  {sec.title}
                </div>
                <div className="space-y-1 mt-1">
                  {allowedInSec.map((item) => {
                    const active = isRouteActive(item.href);
                    const disabled = isPending && item.href !== "/dashboard";

                    if (disabled) {
                      return (
                        <div key={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-600 cursor-not-allowed">
                          <i className={cn(item.icon, "w-4.5 text-center text-sm shrink-0")} />
                          <span className="flex-1 truncate">{item.name}</span>
                          <i className="fa-solid fa-lock text-[10px]" />
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group",
                          active
                            ? "bg-[#00c5a0]/15 text-[#00c5a0] font-semibold border border-[#00c5a0]/30 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f2937]/70"
                        )}
                      >
                        <i className={cn(item.icon, "w-4.5 text-center text-sm shrink-0", active ? "text-[#00c5a0]" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor || "bg-rose-500/20 text-rose-400")}>
                            {item.badge}
                          </span>
                        )}
                        {active && !item.badge && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00c5a0] shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-200 dark:border-[#232d3b] shrink-0">
          <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-[#1e2632]/60 hover:bg-slate-200 dark:hover:bg-[#1e2632] border border-slate-200 dark:border-[#232d3b] transition-colors">
            <Avatar className="w-8.5 h-8.5 shrink-0 border border-[#00c5a0]/40">
              {user?.photoUrl ? <AvatarImage src={user.photoUrl} alt={userName} /> : null}
              <AvatarFallback className="bg-[#00c5a0]/15 text-[#00c5a0] font-bold text-xs">
                {userName ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{role} · {tenantName}</p>
            </div>
            <i className="fa-solid fa-gear text-slate-400 text-xs shrink-0" />
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-200">

        {/* ── Top Header Bar ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 bg-white dark:bg-[#161c24] border-b border-slate-200 dark:border-[#232d3b] shadow-xs gap-3">
          
          {/* Left: Mobile Menu Toggle & Brand / Desktop Search */}
          <div className="flex items-center gap-3 flex-1 max-w-md min-w-0">
            {/* Hamburger Button (Opens Drawer with Menu & Tools) */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open Navigation Menu"
              className="lg:hidden flex items-center justify-center gap-2 h-9 px-3 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-slate-50 dark:bg-[#1a222d] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#232d3b] cursor-pointer shrink-0 transition-colors shadow-2xs font-semibold text-xs"
            >
              <i className="fa-solid fa-bars text-sm text-[#00c5a0]" />
              <span className="inline font-bold">Menu</span>
            </button>

            {/* Desktop Full Search Bar */}
            <div className="relative flex-1 hidden lg:block cursor-pointer" onClick={() => setCommandPaletteOpen(true)}>
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="text" readOnly placeholder="Search Keyword..."
                className="w-full pl-9 pr-12 py-2 text-xs bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-lg outline-none text-slate-900 dark:text-slate-200 placeholder:text-slate-400 cursor-pointer focus:border-[#00c5a0]"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-[#1e2632] border border-slate-300 dark:border-[#232d3b] rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Header Area: Desktop Tools + Logout Always Visible */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop-only Quick Icons */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                className="w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-slate-50 dark:bg-[#1a222d] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2632] flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className={isFullscreen ? "fa-solid fa-compress text-xs" : "fa-solid fa-expand text-xs"} />
              </button>

              {/* Theme Toggle */}
              <div className="w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-slate-50 dark:bg-[#1a222d] flex items-center justify-center">
                <ThemeToggle />
              </div>

              {/* Notifications Bell */}
              <div className="relative">
                <NotificationBell />
              </div>

              {/* Guided Tour */}
              <button
                onClick={() => setTourOpen(true)}
                className="w-9 h-9 border border-[#00c5a0]/40 rounded-lg bg-[#00c5a0]/15 text-[#00c5a0] hover:bg-[#00c5a0]/25 flex items-center justify-center cursor-pointer transition-colors"
                title="Product Tour"
              >
                <i className="fa-solid fa-compass text-xs" />
              </button>

              {/* User Avatar */}
              <div className="ml-1">
              <Link href="/dashboard/settings" className="block no-underline">
                  <Avatar className="w-9 h-9 cursor-pointer border-2 border-[#00c5a0]/40">
                    {user?.photoUrl ? <AvatarImage src={user.photoUrl} alt={userName} /> : null}
                    <AvatarFallback className="bg-[#00c5a0]/15 text-[#00c5a0] font-bold text-xs">
                      {userName ? userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            </div>

            {/* ── Logout Button (Kept outside clean on all screen sizes) ── */}
            <LogoutHeaderBtn />
          </div>
        </header>

        {/* Modals */}
        <GuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} role={role} />
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        {/* ── Page Body ────────────────────────────────────────────────── */}
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto bg-slate-50 dark:bg-[#11161d] text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <ProfileCompletionBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
