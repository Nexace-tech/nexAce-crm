"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface NotificationStatCardsProps {
  totalCount: number;
  unreadCount: number;
  taskCount: number;
  announcementCount: number;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export function NotificationStatCards({
  totalCount,
  unreadCount,
  taskCount,
  announcementCount,
  activeFilter,
  onSelectFilter,
}: NotificationStatCardsProps) {
  const cards = [
    {
      id: "all",
      label: "Total Alerts",
      count: totalCount,
      icon: "fa-solid fa-bell",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      accent: "hover:border-primary/50",
      activeBg: "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs",
    },
    {
      id: "unread",
      label: "Unread Priority",
      count: unreadCount,
      icon: "fa-solid fa-circle-dot",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
      accent: "hover:border-amber-500/50",
      activeBg: "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 shadow-xs",
      pulse: unreadCount > 0,
    },
    {
      id: "task",
      label: "Tasks & Approvals",
      count: taskCount,
      icon: "fa-solid fa-list-check",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      accent: "hover:border-emerald-500/50",
      activeBg: "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs",
    },
    {
      id: "announcement",
      label: "Announcements & Feats",
      count: announcementCount,
      icon: "fa-solid fa-bullhorn",
      color: "text-sky-500",
      bg: "bg-sky-500/10 border-sky-500/20",
      accent: "hover:border-sky-500/50",
      activeBg: "border-sky-500 bg-sky-500/5 dark:bg-sky-500/10 shadow-xs",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {cards.map((card) => {
        const isActive = activeFilter === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter(card.id)}
            className={cn(
              "p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group flex flex-col justify-between min-h-[86px] sm:min-h-[100px]",
              isActive
                ? card.activeBg
                : "bg-card border-border hover:bg-muted/40 hover:shadow-2xs",
              card.accent
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {card.label}
              </span>
              <div
                className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs",
                  card.bg
                )}
              >
                <i className={cn(card.icon, card.color, "text-xs sm:text-sm")} />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                  {card.count}
                </span>
                {card.pulse && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>

              <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                <span>Filter</span>
                <i className="fa-solid fa-arrow-right text-[8px]" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

