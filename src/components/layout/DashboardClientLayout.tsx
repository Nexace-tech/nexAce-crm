"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GuidedTour } from "@/components/guided-tour/GuidedTour";
import { ProfileCompletionBanner } from "@/components/layout/ProfileCompletionBanner";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NativeService } from "@/lib/native/nativeService";
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

// ── Category & Sub-category Navigation Configuration ───────────────────────
export interface SubCategoryItem {
  id: string;
  name: string;
  href: string;
  badge?: string | number;
  badgeColor?: string;
  key?: string;
  nestedItems?: SubCategoryItem[];
}

export interface NavCategoryItem {
  id: string;
  name: string;
  icon: string;
  key?: string;
  href?: string;
  badge?: string | number;
  badgeColor?: string;
  subItems?: SubCategoryItem[];
}

export interface NavSection {
  title: string;
  categories: NavCategoryItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main Menu",
    categories: [
      {
        id: "dash-overview",
        name: "Dashboard",
        icon: "fa-solid fa-gauge-high",
        key: "overview",
        href: "/dashboard",
      },
      {
        id: "dash-team",
        name: "My Team",
        icon: "fa-solid fa-users",
        key: "team",
        href: "/dashboard/team",
      },
      {
        id: "dash-calendar",
        name: "Calendar & Timesheets",
        icon: "fa-solid fa-calendar-days",
        key: "calendar",
        href: "/dashboard/calendar",
      },
      {
        id: "dash-chat",
        name: "Chat & Mail",
        icon: "fa-solid fa-comments",
        key: "chat",
        href: "/dashboard/chat",
      },
      {
        id: "dash-notifications",
        name: "Notification Center",
        icon: "fa-solid fa-bell",
        key: "notifications",
        href: "/dashboard/notifications",
      },
    ],
  },
  {
    title: "OPS Portal",
    categories: [
      {
        id: "operations",
        name: "OPS Portal",
        icon: "fa-solid fa-list-check",
        key: "clients",
        href: "/dashboard/clients?tab=operations",
        subItems: [
          {
            id: "ops-control",
            name: "Operations Control",
            href: "/dashboard/clients?tab=operations",
            nestedItems: [
              { id: "ops-projects", name: "Projects", href: "/dashboard/clients?tab=projects" },
              { id: "ops-tasks", name: "Tasks", href: "/dashboard/clients?tab=tasks" },
              { id: "ops-gantt", name: "Gantt Timeline", href: "/dashboard/clients?tab=gantt" },
              { id: "ops-wiki", name: "SOP Wiki", href: "/dashboard/clients?tab=wiki" },
              { id: "ops-drive", name: "Drive Space", href: "/dashboard/clients?tab=drive" },
              { id: "ops-history", name: "Project History", href: "/dashboard/clients?tab=history" },
            ],
          },
          { id: "ops-contracts", name: "Contracts", href: "/dashboard/clients?tab=contracts" },
          { id: "ops-hr", name: "HR Overview", href: "/dashboard/clients?tab=hr" },
          { id: "ops-external", name: "External Teams", href: "/dashboard/clients?tab=external" },
          { id: "ops-reports", name: "Reports & Data Export", href: "/dashboard/clients?tab=reports" },
          { id: "ops-shifts", name: "Shifts & Status", href: "/dashboard/clients?tab=shifts" },
          { id: "ops-users", name: "User Accounts", href: "/dashboard/clients?tab=users" },
        ],
      },
    ],
  },
  {
    title: "Sales & Revenue",
    categories: [
      {
        id: "bd",
        name: "BD & Sales",
        icon: "fa-solid fa-briefcase",
        key: "bd",
        href: "/dashboard/bd",
        subItems: [
          { id: "bd-overview", name: "BD Overview", href: "/dashboard/bd?tab=dashboard" },
          { id: "bd-leads", name: "Leads Pipeline", href: "/dashboard/bd?tab=all" },
          { id: "bd-deals", name: "Deals Pipeline", href: "/dashboard/bd?tab=deals" },
          { id: "bd-sales", name: "Sales Workdesk", href: "/dashboard/bd?tab=sales" },
          { id: "bd-proposals", name: "Proposals & Quotes", href: "/dashboard/bd?tab=proposals" },
          { id: "bd-referrals", name: "Referral Pipeline", href: "/dashboard/referrals", key: "referrals" },
        ],
      },
      {
        id: "finance",
        name: "Finance Portal",
        icon: "fa-solid fa-coins",
        key: "finance",
        href: "/dashboard/finance",
        subItems: [
          { id: "fin-invoices", name: "Invoices", href: "/dashboard/finance?tab=invoices" },
          { id: "fin-expenses", name: "Expenses", href: "/dashboard/finance?tab=expenses" },
          { id: "fin-budget", name: "Budget & Forecast", href: "/dashboard/finance?tab=budget" },
          { id: "fin-payroll", name: "Payroll", href: "/dashboard/finance?tab=payroll" },
        ],
      },
    ],
  },
  {
    title: "Workspace & Management",
    categories: [
      {
        id: "management",
        name: "Management & HR",
        icon: "fa-solid fa-sliders",
        subItems: [
          { id: "mgmt-hr", name: "HR Portal", href: "/dashboard/hr", key: "hr" },
          { id: "mgmt-goals", name: "Goals & OKRs", href: "/dashboard/goals", key: "goals" },
          { id: "mgmt-it", name: "IT Portal", href: "/dashboard/it", key: "it" },
          { id: "mgmt-analytics", name: "Analytics Logs", href: "/dashboard/analytics", key: "analytics" },
          { id: "mgmt-settings", name: "Settings & Security", href: "/dashboard/settings", key: "settings" },
        ],
      },
    ],
  },
];

function isSubItemActive(subHref: string, pathname: string, currentTab: string | null, isFirst: boolean = false) {
  const [targetPath, targetQuery] = subHref.split("?");
  if (pathname !== targetPath) return false;

  const targetParams = targetQuery ? new URLSearchParams(targetQuery) : null;
  const targetTab = targetParams?.get("tab") || null;

  // When there is NO ?tab= query in the current URL (e.g. /dashboard/clients or /dashboard)
  if (!currentTab) {
    if (!targetTab) return true;
    if (targetPath === "/dashboard/clients" && targetTab === "operations") return true;
    if (targetPath === "/dashboard/bd" && targetTab === "dashboard") return true;
    if (targetPath === "/dashboard/finance" && targetTab === "invoices") return true;
    if (isFirst) return true;
    return false;
  }

  // When ?tab=... is present in the URL
  if (targetTab === currentTab) return true;

  // Aliases for Projects workspace tabs
  if (targetTab === "projects" && (currentTab === "kanban" || currentTab === "projects_grid")) return true;

  return false;
}

function isCategoryActive(cat: NavCategoryItem, pathname: string, currentTab: string | null) {
  if (cat.subItems && cat.subItems.length > 0) {
    return cat.subItems.some((sub) => isSubItemActive(sub.href, pathname, currentTab));
  }
  if (cat.href) {
    if (cat.href === "/dashboard") return pathname === "/dashboard" && !currentTab;
    const targetPath = cat.href.split("?")[0];
    return pathname.startsWith(targetPath);
  }
  return false;
}

interface SidebarNavMenuProps {
  canAccessModule: (key: string) => boolean;
  isEmployeeOrHR: boolean;
  isPending: boolean;
  onNavigate: () => void;
}

function SidebarNavMenu({ canAccessModule, isEmployeeOrHR, isPending, onNavigate }: SidebarNavMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || null;

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    dashboard: true,
    operations: true,
    bd: true,
    finance: true,
    management: true,
  });

  const [opsCounts, setOpsCounts] = useState<{
    operations?: number;
    projects?: number;
    tasks?: number;
    hr?: number;
    external?: number;
  }>({});

  useEffect(() => {
    const fetchCounts = () => {
      Promise.allSettled([
        fetch("/api/projects").then((r) => r.ok && r.json()),
        fetch("/api/tasks").then((r) => r.ok && r.json()),
        fetch("/api/clients?limit=1").then((r) => r.ok && r.json()),
      ]).then(([projectsRes, tasksRes, clientsRes]) => {
        const pCount =
          projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value?.projects)
            ? projectsRes.value.projects.length
            : undefined;
        const tCount =
          tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.tasks)
            ? tasksRes.value.tasks.length
            : undefined;
        const cCount =
          clientsRes.status === "fulfilled" && typeof clientsRes.value?.pagination?.total === "number"
            ? clientsRes.value.pagination.total
            : undefined;

        setOpsCounts((prev) => ({
          ...prev,
          projects: pCount ?? prev.projects,
          tasks: tCount ?? prev.tasks,
          operations: isEmployeeOrHR ? (pCount ?? prev.projects) : (cCount ?? pCount ?? prev.operations),
        }));
      });
    };

    fetchCounts();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", fetchCounts);
      return () => window.removeEventListener("focus", fetchCounts);
    }
  }, [isEmployeeOrHR]);

  const [openNested, setOpenNested] = useState<Record<string, boolean>>({
    "ops-control": true,
  });

  const toggleNested = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenNested((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Auto-expand active category & nested groups
  useEffect(() => {
    for (const sec of navSections) {
      for (const cat of sec.categories) {
        if (isCategoryActive(cat, pathname, currentTab)) {
          setOpenCategories((prev) => ({ ...prev, [cat.id]: true }));
        }
        if (cat.subItems) {
          for (const sub of cat.subItems) {
            if (sub.nestedItems) {
              const hasActiveChild = sub.nestedItems.some((child) =>
                isSubItemActive(child.href, pathname, currentTab)
              );
              if (hasActiveChild || isSubItemActive(sub.href, pathname, currentTab, true)) {
                setOpenNested((prev) => ({ ...prev, [sub.id]: true }));
              }
            }
          }
        }
      }
    }
  }, [pathname, currentTab]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2.5">
      {navSections.map((sec) => {
        const allowedCategories = sec.categories.filter((cat) => {
          if (cat.id === "bd" && isEmployeeOrHR && !canAccessModule("bd")) {
            return false;
          }
          if (cat.key && !canAccessModule(cat.key)) {
            if (!cat.subItems) return false;
            return cat.subItems.some((sub) => sub.key && canAccessModule(sub.key));
          }
          return true;
        });

        if (allowedCategories.length === 0) return null;

        return (
          <div key={sec.title} className="space-y-1.5">
            <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
              {sec.title === "OPS Portal" && isEmployeeOrHR ? "Workspace" : sec.title}
            </div>

            <div className="space-y-1">
              {allowedCategories.map((cat) => {
                let visibleSubItems = cat.subItems
                  ? cat.subItems.filter((sub) => {
                      if (sub.key) return canAccessModule(sub.key);
                      if (cat.key) return canAccessModule(cat.key);
                      return true;
                    })
                  : [];

                if (cat.id === "operations") {
                  if (isEmployeeOrHR) {
                    visibleSubItems = [
                      {
                        id: "ops-control",
                        name: "Projects & Tasks",
                        href: "/dashboard/clients?tab=projects",
                        badge: opsCounts.projects,
                        nestedItems: [
                          { id: "ops-projects", name: "Projects", href: "/dashboard/clients?tab=projects", badge: opsCounts.projects },
                          { id: "ops-tasks", name: "Tasks", href: "/dashboard/clients?tab=tasks", badge: opsCounts.tasks },
                          { id: "ops-gantt", name: "Gantt Timeline", href: "/dashboard/clients?tab=gantt" },
                          { id: "ops-wiki", name: "SOP Wiki", href: "/dashboard/clients?tab=wiki" },
                          { id: "ops-drive", name: "Drive Space", href: "/dashboard/clients?tab=drive" },
                        ],
                      },
                    ];
                  }
                }

                if (cat.id === "management" && isEmployeeOrHR) {
                  visibleSubItems = visibleSubItems.filter((sub) => sub.key === "goals");
                }

                if (cat.id === "finance") {
                  if (isEmployeeOrHR) {
                    visibleSubItems = [
                      { id: "fin-invoices", name: "My Invoices", href: "/dashboard/finance?tab=invoices" },
                      { id: "fin-generate", name: "Generate My Invoice", href: "/dashboard/finance?tab=generate" },
                    ];
                  } else {
                    visibleSubItems = [
                      { id: "fin-invoices", name: "Invoices", href: "/dashboard/finance?tab=invoices" },
                      { id: "fin-generate", name: "Generate Invoice", href: "/dashboard/finance?tab=generate" },
                      { id: "fin-expenses", name: "Expenses", href: "/dashboard/finance?tab=expenses" },
                      { id: "fin-budget", name: "Budget & Forecast", href: "/dashboard/finance?tab=budget" },
                      { id: "fin-payroll", name: "Payroll", href: "/dashboard/finance?tab=payroll" },
                    ];
                  }
                }

                const hasSubItems = visibleSubItems.length > 0;
                if (!hasSubItems && !cat.href) return null;

                const isOpen = !!openCategories[cat.id];
                const active = isCategoryActive(cat, pathname, currentTab);
                const disabled = isPending && cat.href !== "/dashboard";
                const catDisplayName = cat.id === "operations" && isEmployeeOrHR ? "Projects & Workspace" : cat.name;
                const catDisplayIcon = cat.id === "operations" && isEmployeeOrHR ? "fa-solid fa-diagram-project" : cat.icon;

                // Normal Flat Menu Item (e.g. Main Menu options matching screenshot)
                if (!hasSubItems && cat.href) {
                  return (
                    <Link
                      key={cat.id}
                      href={disabled ? "#" : cat.href}
                      onClick={(e) => {
                        if (disabled) {
                          e.preventDefault();
                          return;
                        }
                        onNavigate();
                      }}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 no-underline cursor-pointer select-none",
                        active
                          ? "bg-[#00c5a0]/15 dark:bg-[#00c5a0]/15 text-[#00c5a0] dark:text-[#00c5a0] border border-[#00c5a0]/40 shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2632] border border-transparent font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <i
                          className={cn(
                            catDisplayIcon,
                            "text-sm shrink-0 w-4.5 text-center transition-colors",
                            active
                              ? "text-[#00c5a0]"
                              : "text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                          )}
                        />
                        <span className="text-xs truncate">{catDisplayName}</span>
                      </div>

                      {active && (
                        <span className="w-2 h-2 rounded-full bg-[#00c5a0] shadow-xs shadow-[#00c5a0]/50 shrink-0 ml-2" />
                      )}

                      {cat.badge !== undefined && !active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                          {cat.badge}
                        </span>
                      )}
                    </Link>
                  );
                }

                return (
                  <div key={cat.id} className="select-none">
                    {/* Category Header Bar (Styled like Screenshot 2 with Theme Color) */}
                    <div
                      onClick={() => {
                        if (disabled) return;
                        if (hasSubItems) {
                          toggleCategory(cat.id);
                        }
                      }}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer",
                        active
                          ? "bg-[#00c5a0]/10 dark:bg-[#00c5a0]/15 text-[#00c5a0] dark:text-[#00c5a0] border border-[#00c5a0]/25 shadow-xs font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2632] font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Category Icon Badge */}
                        <div
                          className={cn(
                            "w-7.5 h-7.5 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors",
                            active
                              ? "bg-[#00c5a0] text-slate-950 font-bold shadow-sm shadow-[#00c5a0]/30"
                              : "bg-slate-100 dark:bg-[#1e2632] text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-[#253040] group-hover:text-slate-900 dark:group-hover:text-white"
                          )}
                        >
                          <i className={cn(catDisplayIcon, "text-xs")} />
                        </div>
                        <span className="text-xs truncate">{catDisplayName}</span>
                      </div>

                      {hasSubItems && (
                        <div className="pl-2">
                          <i
                            className={cn(
                              "fa-solid text-[11px] transition-transform duration-200",
                              active
                                ? "text-[#00c5a0]"
                                : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                              isOpen ? "fa-chevron-up" : "fa-chevron-down"
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Sub-categories Tree with dotted vertical guide line and dots */}
                    {hasSubItems && isOpen && (
                      <div className="relative pl-7 ml-3.5 mt-1 mb-2 space-y-0.5">
                        {/* Vertical Dotted Guide Line */}
                        <div className="absolute left-[7.5px] top-1.5 bottom-2.5 w-px border-l-2 border-dotted border-slate-300 dark:border-slate-700 pointer-events-none" />

                        {visibleSubItems.map((sub, subIdx) => {
                          const hasNested = !!(sub.nestedItems && sub.nestedItems.length > 0);
                          const isNestedOpen = !!openNested[sub.id];
                          const isDirectActive = isSubItemActive(sub.href, pathname, currentTab, subIdx === 0);
                          const hasActiveChild = hasNested && sub.nestedItems!.some((child) => isSubItemActive(child.href, pathname, currentTab));
                          const isSubActive = isDirectActive && !hasActiveChild;

                          const dynamicBadge =
                            sub.id === "ops-control"
                              ? (isEmployeeOrHR ? (opsCounts.projects ?? sub.badge) : (opsCounts.operations ?? sub.badge))
                              : sub.id === "ops-projects"
                              ? opsCounts.projects ?? sub.badge
                              : sub.id === "ops-tasks"
                              ? opsCounts.tasks ?? sub.badge
                              : sub.id === "ops-hr"
                              ? opsCounts.hr ?? sub.badge
                              : sub.id === "ops-external"
                              ? opsCounts.external ?? sub.badge
                              : sub.badge;

                          return (
                            <div key={sub.id} className="space-y-0.5">
                              <Link
                                href={sub.href}
                                onClick={() => {
                                  if (hasNested && !isNestedOpen) {
                                    setOpenNested((prev) => ({ ...prev, [sub.id]: true }));
                                  }
                                  onNavigate();
                                }}
                                className={cn(
                                  "group relative flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150 no-underline",
                                  isSubActive
                                    ? "text-[#00c5a0] font-bold bg-[#00c5a0]/10 dark:bg-[#00c5a0]/15"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                                )}
                              >
                                {/* Circle Dot Centered on the Level 1 Dotted Guide Line */}
                                <span
                                  className={cn(
                                    "absolute -left-[24.5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-10 transition-all duration-200",
                                    isSubActive || hasActiveChild
                                      ? "bg-[#00c5a0] ring-4 ring-[#00c5a0]/25 scale-110"
                                      : "bg-slate-400 dark:bg-slate-500 group-hover:bg-slate-700 dark:group-hover:bg-slate-300"
                                  )}
                                />

                                <span className="flex-1 truncate">{sub.name}</span>

                                {dynamicBadge !== undefined && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono",
                                      isSubActive
                                        ? "bg-[#00c5a0]/20 text-[#00c5a0]"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                                    )}
                                  >
                                    {dynamicBadge}
                                  </span>
                                )}

                                {hasNested && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleNested(sub.id, e)}
                                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer ml-1"
                                    title={isNestedOpen ? "Collapse nested menu" : "Expand nested menu"}
                                  >
                                    <i
                                      className={cn(
                                        "fa-solid text-[9px] transition-transform duration-200",
                                        isNestedOpen ? "fa-chevron-up text-[#00c5a0]" : "fa-chevron-down"
                                      )}
                                    />
                                  </button>
                                )}
                              </Link>

                              {/* Nested Sub-Items Tree (Level 3) */}
                              {hasNested && isNestedOpen && (
                                <div className="relative pl-6 ml-3 my-0.5 space-y-0.5">
                                  {/* Inner Vertical Dotted Guide Line */}
                                  <div className="absolute left-[5.5px] top-1 bottom-2 w-px border-l border-dotted border-slate-300 dark:border-slate-700 pointer-events-none" />

                                  {sub.nestedItems!.map((child) => {
                                    const isChildActive = isSubItemActive(child.href, pathname, currentTab);
                                    const childBadge =
                                      child.id === "ops-projects"
                                        ? opsCounts.projects ?? child.badge
                                        : child.id === "ops-tasks"
                                        ? opsCounts.tasks ?? child.badge
                                        : child.badge;

                                    return (
                                      <Link
                                        key={child.id}
                                        href={child.href}
                                        onClick={onNavigate}
                                        className={cn(
                                          "group relative flex items-center gap-2 py-1 px-2 rounded-lg text-[11.5px] font-medium transition-all duration-150 no-underline",
                                          isChildActive
                                            ? "text-[#00c5a0] font-bold bg-[#00c5a0]/10 dark:bg-[#00c5a0]/15"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                                        )}
                                      >
                                        {/* Smaller Circle Dot Centered on Inner Guideline */}
                                        <span
                                          className={cn(
                                            "absolute -left-[20px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full z-10 transition-all duration-200",
                                            isChildActive
                                              ? "bg-[#00c5a0] ring-3 ring-[#00c5a0]/30 scale-125"
                                              : "bg-slate-400 dark:bg-slate-500 group-hover:bg-slate-700 dark:group-hover:bg-slate-300"
                                          )}
                                        />

                                        <span className="flex-1 truncate">{child.name}</span>

                                        {childBadge !== undefined && (
                                          <span
                                            className={cn(
                                              "text-[9.5px] font-bold px-1.5 py-0.2 rounded-full font-mono",
                                              isChildActive
                                                ? "bg-[#00c5a0]/20 text-[#00c5a0]"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                                            )}
                                          >
                                            {childBadge}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardClientLayout({ session, menuItems, isPending = false, children }: DashboardClientLayoutProps) {
  const { user } = useAuthContext();
  const { canAccessModule, isAdmin, isOPS, role: permRole } = usePermissions();
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
    const handleOpenTour = () => setTourOpen(true);
    window.addEventListener("open-guided-tour", handleOpenTour);
    return () => window.removeEventListener("open-guided-tour", handleOpenTour);
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
  const role = user?.role || session.role || permRole;
  const tenantName = (user?.tenantId as any)?.name || session.tenantName;
  const isEmployeeOrHR = !isAdmin && !isOPS && (
    role?.toLowerCase() === "employee" || 
    role?.toLowerCase() === "hr" || 
    !role
  );

  useEffect(() => {
    if (user?._id) {
      NativeService.initPushNotifications().catch(() => {});
    }
  }, [user?._id]);

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
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-[#00c5a0] to-[#008080] flex items-center justify-center shadow-md shadow-[#00c5a0]/20">
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
            <div className="flex-1 flex items-center justify-center h-8 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-2xs">
              <ThemeToggle />
            </div>
            <div className="flex-1 flex items-center justify-center h-8 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-2xs">
              <NotificationBell />
            </div>
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

        {/* Real Features Navigation: Category and Sub-category tree */}
        <React.Suspense fallback={<div className="flex-1 p-4" />}>
          <SidebarNavMenu
            canAccessModule={canAccessModule}
            isEmployeeOrHR={isEmployeeOrHR}
            isPending={isPending}
            onNavigate={() => setMobileOpen(false)}
          />
        </React.Suspense>

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
        <OnboardingScreens />
        <GuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} role={role} />
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        {/* ── Page Body ────────────────────────────────────────────────── */}
        <main className="flex-1 p-3.5 sm:p-6 pb-24 lg:pb-6 overflow-y-auto bg-slate-50 dark:bg-[#11161d] text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <ProfileCompletionBanner />
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Navigation Bar (Fixed 5-Tab Dock) ── */}
        <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} isMenuOpen={mobileOpen} />
      </div>
    </div>
  );
}
