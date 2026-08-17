"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Quick Actions" | "System";
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

  const commandItems: CommandItem[] = [
    // Navigation Modules
    { id: "nav-overview", title: "Overview Dashboard", category: "Navigation", icon: "fa-solid fa-chart-simple", href: "/dashboard", moduleKey: "overview", keywords: ["kpi", "home", "stats", "attendance"] },
    { id: "nav-users", title: "User Management (Admin)", category: "Navigation", icon: "fa-solid fa-users-gear", href: "/dashboard/settings?tab=users", featureKey: "manageUsers", keywords: ["staff", "accounts", "rbac", "passwords"] },
    { id: "nav-team", title: "My Team Directory", category: "Navigation", icon: "fa-solid fa-users", href: "/dashboard/team", moduleKey: "team", keywords: ["employees", "org chart", "roster", "directory"] },
    { id: "nav-calendar", title: "Calendar & Timesheets", category: "Navigation", icon: "fa-solid fa-calendar-days", href: "/dashboard/calendar", moduleKey: "calendar", keywords: ["shifts", "work logs", "clock in", "punch"] },
    { id: "nav-sprints", title: "Sprints & Agile Planning", category: "Navigation", icon: "fa-solid fa-person-running", href: "/dashboard/calendar?tab=sprints", moduleKey: "projects", keywords: ["scrum", "sprints", "backlog", "cycle"] },
    { id: "nav-projects", title: "Projects, Kanban & Tasks", category: "Navigation", icon: "fa-solid fa-folder-tree", href: "/dashboard/projects", moduleKey: "projects", keywords: ["tasks", "kanban", "wiki", "gantt", "drive"] },
    { id: "nav-tasks", title: "HR Tasks & Workflows", category: "Navigation", icon: "fa-solid fa-list-check", href: "/dashboard/hr?tab=tasks", moduleKey: "hr", keywords: ["todos", "checklists", "workflow"] },
    { id: "nav-chat", title: "Chat & Direct Messages", category: "Navigation", icon: "fa-solid fa-comments", href: "/dashboard/chat", moduleKey: "chat", keywords: ["messages", "channels", "inbox", "mail center", "whatsapp"] },
    { id: "nav-huddles", title: "Virtual Video Huddles", category: "Navigation", icon: "fa-solid fa-video", href: "/dashboard/chat", featureKey: "joinVirtualHuddles", keywords: ["meeting", "call", "audio", "video"] },
    { id: "nav-hr", title: "HR Portal & Appraisals", category: "Navigation", icon: "fa-solid fa-briefcase", href: "/dashboard/hr", moduleKey: "hr", keywords: ["leave", "onboarding", "cases", "performance", "appraisals"] },
    { id: "nav-goals", title: "Goals & Strategic OKRs", category: "Navigation", icon: "fa-solid fa-bullseye", href: "/dashboard/goals", moduleKey: "goals", keywords: ["okrs", "targets", "kpis", "metrics"] },
    { id: "nav-surveys", title: "Pulse Surveys & Team Feedback", category: "Navigation", icon: "fa-solid fa-clipboard-question", href: "/dashboard/goals", featureKey: "viewGoals", keywords: ["polls", "sentiment", "feedback", "surveys"] },
    { id: "nav-analytics", title: "Analytics & Audit Logs", category: "Navigation", icon: "fa-solid fa-chart-line", href: "/dashboard/analytics", moduleKey: "analytics", keywords: ["reports", "security", "activity", "audit"] },
    { id: "nav-crm", title: "Operations & Retainers Portal", category: "Navigation", icon: "fa-solid fa-list-check", href: "/dashboard/clients", moduleKey: "clients", keywords: ["clients", "operations", "projects", "contracts"] },
    { id: "nav-sales", title: "Sales Deals & Pipeline", category: "Navigation", icon: "fa-solid fa-handshake", href: "/dashboard/clients?tab=sales", featureKey: "viewDeals", keywords: ["deals", "sales", "crm", "pipeline", "revenue"] },
    { id: "nav-it", title: "IT & Infrastructure Portal", category: "Navigation", icon: "fa-solid fa-terminal", href: "/dashboard/it", moduleKey: "it", keywords: ["access keys", "hardware", "devices", "subscriptions", "it portal", "invoices"] },
    { id: "nav-referrals", title: "Candidate Referral Pipeline", category: "Navigation", icon: "fa-solid fa-link", href: "/dashboard/referrals", moduleKey: "referrals", keywords: ["bonus", "hiring", "candidates", "referrals"] },
    { id: "nav-notifs", title: "Notification Center", category: "Navigation", icon: "fa-solid fa-bell", href: "/dashboard/notifications", keywords: ["alerts", "broadcasts", "notifications"] },
    { id: "nav-settings", title: "Settings & Administration", category: "Navigation", icon: "fa-solid fa-gear", href: "/dashboard/settings", moduleKey: "settings", keywords: ["rbac", "permissions", "branding", "shifts", "subscription"] },

    // Quick Actions
    { id: "act-okr", title: "Create Strategic OKR", category: "Quick Actions", icon: "fa-solid fa-bullseye", href: "/dashboard/goals", featureKey: "createGoals", keywords: ["add okr", "new goal", "target"] },
    { id: "act-kudos", title: "Give Kudos to Colleague", category: "Quick Actions", icon: "fa-solid fa-wand-magic-sparkles", href: "/dashboard/goals", featureKey: "sendKudos", keywords: ["recognition", "appreciation", "thanks"] },
    { id: "act-survey", title: "Launch Team Pulse Survey", category: "Quick Actions", icon: "fa-solid fa-plus", href: "/dashboard/goals", featureKey: "manageSurveys", keywords: ["new survey", "poll"] },
    { id: "act-referral", title: "Submit Candidate Referral", category: "Quick Actions", icon: "fa-solid fa-user-plus", href: "/dashboard/referrals", featureKey: "submitReferral", keywords: ["nominate", "refer candidate"] },
    { id: "act-timesheet", title: "Log Timesheet Hours", category: "Quick Actions", icon: "fa-solid fa-clock", href: "/dashboard/calendar", featureKey: "logOwnTimesheet", keywords: ["punch", "work log", "hours"] },
    { id: "act-client", title: "Add Operations Project", category: "Quick Actions", icon: "fa-solid fa-list-check", href: "/dashboard/clients", featureKey: "createClients", keywords: ["new client", "new retainer", "project"] },
    { id: "act-deal", title: "Create New Sales Deal", category: "Quick Actions", icon: "fa-solid fa-handshake", href: "/dashboard/clients?tab=sales", featureKey: "manageDeals", keywords: ["new deal", "pipeline", "lead"] },
    { id: "act-drive", title: "Upload Drive Document", category: "Quick Actions", icon: "fa-solid fa-cloud-arrow-up", href: "/dashboard/projects", featureKey: "uploadDriveFiles", keywords: ["upload file", "drive", "documents"] },
    { id: "act-it-access", title: "Grant Tool Access / Key", category: "Quick Actions", icon: "fa-solid fa-key", href: "/dashboard/it", featureKey: "manageITAccess", keywords: ["grant access", "credential", "it key"] },
    { id: "act-it-device", title: "Register Hardware Asset", category: "Quick Actions", icon: "fa-solid fa-laptop-medical", href: "/dashboard/it", featureKey: "manageITDevices", keywords: ["add device", "laptop", "hardware"] },
    { id: "act-it-invoice", title: "Create IT / Client Invoice", category: "Quick Actions", icon: "fa-solid fa-file-invoice-dollar", href: "/dashboard/it", featureKey: "manageITInvoices", keywords: ["billing", "invoice", "payment"] },
    { id: "act-broadcast", title: "Broadcast Announcement", category: "Quick Actions", icon: "fa-solid fa-bullhorn", href: "/dashboard/notifications", featureKey: "createAnnouncements", keywords: ["announcement", "broadcast", "alert"] },

    // System
    { id: "sys-theme", title: "Toggle Dark / Light Theme", category: "System", icon: "fa-solid fa-circle-half-stroke", action: () => { document.documentElement.classList.toggle("dark"); }, keywords: ["theme", "dark mode", "light mode"] },
  ];

  const permittedItems = commandItems.filter((item) => {
    if (isAdmin || isOPS) return true;
    if (item.adminOnly) return false;
    if (item.moduleKey && !canAccessModule(item.moduleKey)) return false;
    if (item.featureKey && !can(item.featureKey)) return false;
    return true;
  });

  const filteredItems = permittedItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchCategory = item.category.toLowerCase().includes(q);
    const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
    return matchTitle || matchCategory || matchKeywords;
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

  // Prefetch routes for instant zero-latency navigation
  useEffect(() => {
    commandItems.forEach((item) => {
      if (item.href) {
        try {
          router.prefetch(item.href);
        } catch {}
      }
    });
  }, [router]);

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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border bg-muted/30">
          <i className="fa-solid fa-magnifying-glass text-muted-foreground text-sm mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace... (e.g. OKRs, Referrals, Timesheets)"
            className="w-full py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No matching commands found.</p>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => {
                    setSelectedIndex(idx);
                    if (item.href) router.prefetch(item.href);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <i className={cn(item.icon, "text-sm", isSelected ? "text-primary-foreground" : "text-primary")} />
                    <span>{item.title}</span>
                  </div>
                  <span className={cn("text-[10px] font-mono", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-muted border px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-muted border px-1 rounded">↵</kbd> Select</span>
          </div>
          <span>NexAce Quick Command Palette</span>
        </div>
      </div>
    </div>
  );
}
