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
    // Navigation
    { id: "nav-overview", title: "Overview Dashboard", category: "Navigation", icon: "fa-solid fa-chart-simple", href: "/dashboard", moduleKey: "overview" },
    { id: "nav-users", title: "User Management (Admin)", category: "Navigation", icon: "fa-solid fa-users-gear", href: "/dashboard/settings?tab=users", featureKey: "manageUsers" },
    { id: "nav-team", title: "My Team Directory", category: "Navigation", icon: "fa-solid fa-users", href: "/dashboard/team", moduleKey: "team" },
    { id: "nav-calendar", title: "Calendar & Timesheets", category: "Navigation", icon: "fa-solid fa-calendar-days", href: "/dashboard/calendar", moduleKey: "calendar" },
    { id: "nav-projects", title: "Projects, Sprints & Drive", category: "Navigation", icon: "fa-solid fa-folder-tree", href: "/dashboard/projects", moduleKey: "projects" },
    { id: "nav-tasks", title: "HR Tasks & Workflows", category: "Navigation", icon: "fa-solid fa-list-check", href: "/dashboard/hr?tab=tasks", moduleKey: "hr" },
    { id: "nav-chat", title: "Chat & Direct Messages", category: "Navigation", icon: "fa-solid fa-comments", href: "/dashboard/chat", moduleKey: "chat" },
    { id: "nav-hr", title: "HR Portal & Appraisals", category: "Navigation", icon: "fa-solid fa-briefcase", href: "/dashboard/hr", moduleKey: "hr" },
    { id: "nav-goals", title: "Goals, OKRs & Surveys", category: "Navigation", icon: "fa-solid fa-bullseye", href: "/dashboard/goals", moduleKey: "goals" },
    { id: "nav-analytics", title: "Analytics & Audit Logs", category: "Navigation", icon: "fa-solid fa-chart-line", href: "/dashboard/analytics", moduleKey: "analytics" },
    { id: "nav-crm", title: "Operations Projects", category: "Navigation", icon: "fa-solid fa-list-check", href: "/dashboard/clients", moduleKey: "clients" },
    { id: "nav-referrals", title: "Referral Pipeline", category: "Navigation", icon: "fa-solid fa-link", href: "/dashboard/referrals", moduleKey: "referrals" },
    { id: "nav-notifs", title: "Notification Center", category: "Navigation", icon: "fa-solid fa-bell", href: "/dashboard/notifications" },
    { id: "nav-settings", title: "Settings & Administration", category: "Navigation", icon: "fa-solid fa-gear", href: "/dashboard/settings", moduleKey: "settings" },

    // Quick Actions
    { id: "act-okr", title: "Create Strategic OKR", category: "Quick Actions", icon: "fa-solid fa-bullseye", href: "/dashboard/goals", featureKey: "createGoals" },
    { id: "act-kudos", title: "Give Kudos to Colleague", category: "Quick Actions", icon: "fa-solid fa-wand-magic-sparkles", href: "/dashboard/goals", featureKey: "sendKudos" },
    { id: "act-referral", title: "Submit Candidate Referral", category: "Quick Actions", icon: "fa-solid fa-user-plus", href: "/dashboard/referrals", featureKey: "submitReferral" },
    { id: "act-timesheet", title: "Log Timesheet Hours", category: "Quick Actions", icon: "fa-solid fa-clock", href: "/dashboard/calendar", featureKey: "logOwnTimesheet" },
    { id: "act-client", title: "Add Operations Project", category: "Quick Actions", icon: "fa-solid fa-list-check", href: "/dashboard/clients", featureKey: "createClients" },
    { id: "act-drive", title: "Upload Drive Document", category: "Quick Actions", icon: "fa-solid fa-cloud-arrow-up", href: "/dashboard/projects", featureKey: "uploadDriveFiles" },

    // System
    { id: "sys-theme", title: "Toggle Dark / Light Theme", category: "System", icon: "fa-solid fa-circle-half-stroke", action: () => { document.documentElement.classList.toggle("dark"); } },
  ];

  const permittedItems = commandItems.filter((item) => {
    if (isAdmin || isOPS) return true;
    if (item.adminOnly) return false;
    if (item.moduleKey && !canAccessModule(item.moduleKey)) return false;
    if (item.featureKey && !can(item.featureKey)) return false;
    return true;
  });

  const filteredItems = permittedItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

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
