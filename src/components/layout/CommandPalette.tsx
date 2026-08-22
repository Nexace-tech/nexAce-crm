"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Projects & Boards" | "Team Directory" | "Quick Actions" | "Navigation" | "System";
  icon: string;
  href?: string;
  moduleKey?: string;
  featureKey?: string;
  adminOnly?: boolean;
  keywords?: string[];
  action?: () => void;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { can, canAccessModule, isAdmin, isOPS } = usePermissions();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveProjects, setLiveProjects] = useState<CommandItem[]>([]);
  const [liveUsers, setLiveUsers] = useState<CommandItem[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch live workspace data (Projects & Team) when palette is open
  useEffect(() => {
    if (!open) return;

    let isSubscribed = true;
    setLoadingLive(true);

    Promise.all([
      fetch("/api/projects").then((res) => (res.ok ? res.json() : { projects: [] })).catch(() => ({ projects: [] })),
      fetch("/api/users").then((res) => (res.ok ? res.json() : { users: [] })).catch(() => ({ users: [] })),
    ]).then(([projData, userData]) => {
      if (!isSubscribed) return;

      const projs: CommandItem[] = (projData.projects || []).map((p: any) => ({
        id: `proj-${p._id}`,
        title: p.name,
        subtitle: `Project Board • ${p.status || "In Progress"}`,
        category: "Projects & Boards" as const,
        icon: "fa-solid fa-folder-open text-amber-500",
        href: `/dashboard/projects?projectId=${p._id}`,
        keywords: [p.name, p.status, "project", "kanban", "board", p.category || ""],
      }));

      const users: CommandItem[] = (userData.users || []).map((u: any) => ({
        id: `user-${u._id}`,
        title: u.name,
        subtitle: `${u.role || "Member"} • ${u.department || "General"} • ${u.email}`,
        category: "Team Directory" as const,
        icon: "fa-solid fa-user text-sky-500",
        href: `/dashboard/team?search=${encodeURIComponent(u.name)}`,
        keywords: [u.name, u.email, u.role, u.department, "member", "staff"],
      }));

      setLiveProjects(projs);
      setLiveUsers(users);
      setLoadingLive(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [open]);

  const staticCommandItems: CommandItem[] = [
    // Navigation Modules
    { id: "nav-overview", title: "Overview Dashboard", subtitle: "Real-time KPIs, attendance summary & statistics", category: "Navigation", icon: "fa-solid fa-chart-simple", href: "/dashboard", moduleKey: "overview", keywords: ["kpi", "home", "stats", "attendance"] },
    { id: "nav-users", title: "User Management (Admin)", subtitle: "Manage workspace accounts, roles & credentials", category: "Navigation", icon: "fa-solid fa-users-gear", href: "/dashboard/settings?tab=users", featureKey: "manageUsers", keywords: ["staff", "accounts", "rbac", "passwords"] },
    { id: "nav-team", title: "My Team Directory", subtitle: "Org hierarchy chart, roster & department breakdown", category: "Navigation", icon: "fa-solid fa-users", href: "/dashboard/team", moduleKey: "team", keywords: ["employees", "org chart", "roster", "directory"] },
    { id: "nav-calendar", title: "Calendar & Timesheets", subtitle: "Shift scheduling, daily punch timesheets & leaves", category: "Navigation", icon: "fa-solid fa-calendar-days", href: "/dashboard/calendar", moduleKey: "calendar", keywords: ["shifts", "work logs", "clock in", "punch"] },
    { id: "nav-projects", title: "Projects & Kanban Boards", subtitle: "Agile sprints, Kanban tasks, SOP Wiki & Drive space", category: "Navigation", icon: "fa-solid fa-folder-tree", href: "/dashboard/projects", moduleKey: "projects", keywords: ["tasks", "kanban", "wiki", "gantt", "drive"] },
    { id: "nav-chat", title: "Communication Hub", subtitle: "Workspace channels, direct messaging, mail & video huddles", category: "Navigation", icon: "fa-solid fa-comments", href: "/dashboard/chat", moduleKey: "chat", keywords: ["messages", "channels", "inbox", "mail center", "whatsapp"] },
    { id: "nav-hr", title: "HR Portal & Appraisals", subtitle: "Employee lifecycle, onboarding, attendance & appraisals", category: "Navigation", icon: "fa-solid fa-briefcase", href: "/dashboard/hr", moduleKey: "hr", keywords: ["leave", "onboarding", "cases", "performance", "appraisals"] },
    { id: "nav-goals", title: "Goals & Strategic OKRs", subtitle: "Company objectives, team pulse surveys & kudos wall", category: "Navigation", icon: "fa-solid fa-bullseye", href: "/dashboard/goals", moduleKey: "goals", keywords: ["okrs", "targets", "kpis", "metrics"] },
    { id: "nav-analytics", title: "Analytics & Audit Logs", subtitle: "Performance metrics, time utilization & security trail", category: "Navigation", icon: "fa-solid fa-chart-line", href: "/dashboard/analytics", moduleKey: "analytics", keywords: ["reports", "security", "activity", "audit"] },
    { id: "nav-crm", title: "Operations & Retainers Portal", subtitle: "Client retainers, sales pipeline & operations desk", category: "Navigation", icon: "fa-solid fa-list-check", href: "/dashboard/clients", moduleKey: "clients", keywords: ["clients", "operations", "projects", "contracts"] },
    { id: "nav-it", title: "IT & Infrastructure Portal", subtitle: "Hardware assets, software subscriptions & access keys", category: "Navigation", icon: "fa-solid fa-terminal", href: "/dashboard/it", moduleKey: "it", keywords: ["access keys", "hardware", "devices", "subscriptions", "it portal", "invoices"] },
    { id: "nav-referrals", title: "Candidate Referral Pipeline", subtitle: "Referral links, commission tracking & candidate bonus", category: "Navigation", icon: "fa-solid fa-link", href: "/dashboard/referrals", moduleKey: "referrals", keywords: ["bonus", "hiring", "candidates", "referrals"] },
    { id: "nav-docs", title: "Documentation & Feature Guide", subtitle: "Step-by-step operational workflows, hotkeys & manual", category: "Navigation", icon: "fa-solid fa-book-open text-indigo-500", href: "/guide", keywords: ["docs", "guide", "manual", "help", "faq", "user guide"] },
    { id: "nav-settings", title: "Settings & Security", subtitle: "Profile, multi-tenant RBAC, shifts & billing subscription", category: "Navigation", icon: "fa-solid fa-gear", href: "/dashboard/settings", moduleKey: "settings", keywords: ["rbac", "permissions", "branding", "shifts", "subscription"] },

    // Quick Actions
    { id: "act-leave", title: "Apply for Leave Request", subtitle: "Submit vacation, sick leave, or time-off request", category: "Quick Actions", icon: "fa-solid fa-calendar-plus text-rose-500", href: "/dashboard/hr?tab=leaves", featureKey: "applyLeaves", keywords: ["leave", "vacation", "sick leave", "pto", "time off"] },
    { id: "act-new-project", title: "Create New Project Board", subtitle: "Add a new agile sprint or team project", category: "Quick Actions", icon: "fa-solid fa-folder-plus text-emerald-500", href: "/dashboard/projects", keywords: ["new project", "add board", "create project"] },
    { id: "act-okr", title: "Create Strategic OKR Target", subtitle: "Set company-wide or team objectives", category: "Quick Actions", icon: "fa-solid fa-bullseye text-indigo-500", href: "/dashboard/goals", featureKey: "createGoals", keywords: ["add okr", "new goal", "target"] },
    { id: "act-kudos", title: "Give Kudos to Colleague", subtitle: "Appreciate team member on public wall", category: "Quick Actions", icon: "fa-solid fa-hands-clapping text-violet-500", href: "/dashboard/goals", featureKey: "sendKudos", keywords: ["recognition", "appreciation", "thanks", "kudos"] },
    { id: "act-timesheet", title: "Log Daily Timesheet Hours", subtitle: "Record working hours against projects", category: "Quick Actions", icon: "fa-solid fa-clock text-amber-500", href: "/dashboard/calendar", featureKey: "logOwnTimesheet", keywords: ["punch", "work log", "hours", "clock in", "timesheet"] },
    { id: "act-wiki", title: "Browse SOPs & Wiki Knowledge", subtitle: "Explore internal company standard operating procedures", category: "Quick Actions", icon: "fa-solid fa-book-bookmark text-sky-500", href: "/dashboard/projects?tab=wiki", keywords: ["wiki", "sop", "knowledge", "guide", "procedure"] },
    { id: "act-client", title: "Add Operations Project", subtitle: "Create new client workflow or retainer", category: "Quick Actions", icon: "fa-solid fa-list-check text-cyan-500", href: "/dashboard/clients", featureKey: "createClients", keywords: ["new client", "new retainer", "project"] },
    { id: "act-deal", title: "Create New Sales Deal", subtitle: "Add lead to CRM pipeline workdesk", category: "Quick Actions", icon: "fa-solid fa-handshake text-emerald-500", href: "/dashboard/clients?tab=sales", featureKey: "manageDeals", keywords: ["new deal", "pipeline", "lead"] },
    { id: "act-it-device", title: "Register Hardware Device", subtitle: "Log company laptop, monitor, or asset", category: "Quick Actions", icon: "fa-solid fa-laptop-medical text-blue-500", href: "/dashboard/it", featureKey: "manageITDevices", keywords: ["add device", "laptop", "hardware"] },
    { id: "act-it-invoice", title: "Generate Invoice", subtitle: "Create self-service or IT billing invoice", category: "Quick Actions", icon: "fa-solid fa-file-invoice-dollar text-teal-500", href: "/dashboard/settings?tab=invoice", keywords: ["billing", "invoice", "payment"] },

    // System
    {
      id: "sys-theme",
      title: "Toggle Light / Dark Mode",
      subtitle: "Switch theme appearance instantly",
      category: "System",
      icon: "fa-solid fa-circle-half-stroke",
      action: () => {
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        if (isDark) {
          root.classList.remove("dark");
          localStorage.setItem("theme", "light");
        } else {
          root.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
      },
      keywords: ["theme", "dark mode", "light mode"],
    },
  ];

  const permittedStaticItems = staticCommandItems.filter((item) => {
    if (isAdmin || isOPS) return true;
    if (item.adminOnly) return false;
    if (item.moduleKey && !canAccessModule(item.moduleKey)) return false;
    if (item.featureKey && !can(item.featureKey)) return false;
    return true;
  });

  const allItems = [...liveProjects, ...liveUsers, ...permittedStaticItems];

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchSubtitle = item.subtitle?.toLowerCase().includes(q) ?? false;
    const matchCategory = item.category.toLowerCase().includes(q);
    const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
    return matchTitle || matchSubtitle || matchCategory || matchKeywords;
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, filteredItems]);

  const executeCommand = (item: CommandItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted/30 gap-3">
          <i className="fa-solid fa-magnifying-glass text-primary text-base" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, team members, actions or modules... (Ctrl + K)"
            className="w-full text-sm font-medium bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loadingLive && (
            <i className="fa-solid fa-circle-notch fa-spin text-xs text-primary shrink-0" title="Loading live data..." />
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Category Filter Pills (When search query is empty) */}
        {!query && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-muted/10 text-[11px] overflow-x-auto no-scrollbar">
            <span className="text-muted-foreground font-semibold shrink-0">Quick jump:</span>
            {["Projects & Boards", "Team Directory", "Quick Actions", "Navigation"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setQuery(cat === "Projects & Boards" ? "project" : cat === "Team Directory" ? "team" : cat === "Quick Actions" ? "create" : "")}
                className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer shrink-0"
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <i className="fa-solid fa-magnifying-glass text-2xl opacity-40 block" />
              <p className="text-sm font-semibold">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs">Try searching for a project name, colleague, or CRM action.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <i className={cn(item.icon, "text-xs")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-xs">{item.title}</p>
                      {item.subtitle && (
                        <p className={cn("truncate text-[10px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono shrink-0 ml-3 px-2 py-0.5 rounded-md",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px] shadow-2xs">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px] shadow-2xs">↵</kbd> Open
            </span>
            <span>
              <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px] shadow-2xs">ESC</kbd> Close
            </span>
          </div>
          <span className="font-medium">{filteredItems.length} results</span>
        </div>
      </div>
    </div>
  );
}

