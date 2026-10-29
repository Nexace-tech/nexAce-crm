"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getNotificationTargetUrl } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessRestricted } from "@/components/ui/AccessRestricted";
import { FeatureBroadcastDesk } from "@/components/notifications/FeatureBroadcastDesk";
import { NotificationStatCards } from "@/components/notifications/NotificationStatCards";

interface NotifItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

type FilterType =
  | "all"
  | "unread"
  | "task"
  | "chat"
  | "announcement"
  | "hr"
  | "finance"
  | "kudos"
  | "system"
  | "feature_releases";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;
  if (diff < dayMs && date.getDate() === now.getDate()) return "Today";
  if (diff < 2 * dayMs) return "Yesterday";
  if (diff < 7 * dayMs) return "This Week";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Earlier"];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS, canAccessModule, loading: permLoading } = usePermissions();

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat");

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchOperating, setBatchOperating] = useState(false);

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showFeatureBroadcastModal, setShowFeatureBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: "single" | "all" | "selected";
    id?: string;
    title?: string;
  }>({ isOpen: false, type: "single" });
  const [deleting, setDeleting] = useState(false);

  // Search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchNotifications = async (quiet = false) => {
    try {
      if (!quiet) setRefreshing(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Quietly handle transient disconnect
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      fetchNotifications(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Computed Category Counts for Live Badges
  const counts = useMemo(() => {
    let unread = 0;
    let task = 0;
    let chat = 0;
    let announcement = 0;
    let hr = 0;
    let finance = 0;
    let kudos = 0;
    let system = 0;

    notifications.forEach((n) => {
      if (!n.read) unread++;
      if (n.type === "task") task++;
      else if (n.type === "chat") chat++;
      else if (n.type === "announcement") announcement++;
      else if (["hr", "leave", "appraisal", "referral"].includes(n.type)) hr++;
      else if (n.type === "finance" || n.title.toLowerCase().includes("invoice") || n.title.toLowerCase().includes("payout")) finance++;
      else if (n.type === "kudos") kudos++;
      else if (["system", "okr"].includes(n.type)) system++;
    });

    return {
      all: notifications.length,
      unread,
      task,
      chat,
      announcement,
      hr,
      finance,
      kudos,
      system,
    };
  }, [notifications]);

  // Filtered Notifications list
  const filteredNotifications = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return notifications.filter((n) => {
      // Category filter
      if (filterType === "unread" && n.read) return false;
      if (filterType === "task" && n.type !== "task") return false;
      if (filterType === "chat" && n.type !== "chat") return false;
      if (filterType === "announcement" && n.type !== "announcement") return false;
      if (filterType === "hr" && !["hr", "leave", "appraisal", "referral"].includes(n.type)) return false;
      if (filterType === "finance" && n.type !== "finance" && !n.title.toLowerCase().includes("invoice") && !n.title.toLowerCase().includes("payout")) return false;
      if (filterType === "kudos" && n.type !== "kudos") return false;
      if (filterType === "system" && !["system", "okr"].includes(n.type)) return false;

      // Read status filter
      if (readFilter === "unread" && n.read) return false;
      if (readFilter === "read" && !n.read) return false;

      // Date range filter
      const createdDate = new Date(n.createdAt);
      if (dateFilter === "today" && createdDate < startOfToday) return false;
      if (dateFilter === "7days" && createdDate < sevenDaysAgo) return false;
      if (dateFilter === "30days" && createdDate < thirtyDaysAgo) return false;

      // Search query filter
      if (search) {
        const query = search.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
      }
      return true;
    });
  }, [notifications, filterType, readFilter, dateFilter, search]);

  // Reset to Page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filterType, readFilter, dateFilter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  // Grouped Notifications for Date Grouping view
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, NotifItem[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };
    paginatedNotifications.forEach((n) => {
      const g = getDateGroup(n.createdAt);
      if (groups[g]) groups[g].push(n);
      else groups["Earlier"].push(n);
    });
    return groups;
  }, [paginatedNotifications]);

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  // Mark single read / open
  const handleMarkSingleRead = async (id: string, linkUrl?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark single read error:", err);
    }

    if (linkUrl) {
      router.push(linkUrl);
    }
  };

  // Toggle single read/unread status
  const handleToggleSingleRead = async (e: React.MouseEvent, id: string, currentRead: boolean) => {
    e.stopPropagation();
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, markUnread: currentRead }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: !currentRead } : n))
      );
      setUnreadCount((prev) => (currentRead ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      console.error("Toggle read error:", err);
    }
  };

  // Multi-Selection Handlers
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedNotifications.map((n) => n._id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Batch Mark as Read
  const handleBatchMarkRead = async () => {
    if (selectedIds.size === 0) return;
    setBatchOperating(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id }),
          })
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (selectedIds.has(n._id) ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - selectedIds.size));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Batch mark read error:", err);
    } finally {
      setBatchOperating(false);
    }
  };

  // Confirm delete handler
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteConfirmModal.type === "single" && deleteConfirmModal.id) {
        const res = await fetch(`/api/notifications?id=${deleteConfirmModal.id}`, { method: "DELETE" });
        if (res.ok) {
          setNotifications((prev) => prev.filter((n) => n._id !== deleteConfirmModal.id));
        }
      } else if (deleteConfirmModal.type === "all") {
        const res = await fetch("/api/notifications?all=true", { method: "DELETE" });
        if (res.ok) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } else if (deleteConfirmModal.type === "selected" && selectedIds.size > 0) {
        const ids = Array.from(selectedIds);
        await Promise.all(
          ids.map((id) => fetch(`/api/notifications?id=${id}`, { method: "DELETE" }))
        );
        setNotifications((prev) => prev.filter((n) => !selectedIds.has(n._id)));
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("Delete notification error:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirmModal({ isOpen: false, type: "single" });
    }
  };

  // Send Broadcast Announcement Form Handler
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          linkUrl: broadcastLink,
          broadcast: true,
          type: "announcement",
        }),
      });

      if (res.ok) {
        setShowBroadcastModal(false);
        setBroadcastTitle("");
        setBroadcastMessage("");
        setBroadcastLink("");
        fetchNotifications(true);
      }
    } catch (err) {
      console.error("Send broadcast error:", err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const getTypeDetails = (type: string, title: string = "") => {
    const isFinance = type === "finance" || title.toLowerCase().includes("invoice") || title.toLowerCase().includes("payout");
    if (isFinance) {
      return { icon: "fa-solid fa-file-invoice-dollar", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Finance" };
    }
    switch (type) {
      case "chat":
        return { icon: "fa-solid fa-comments", color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20", label: "Chat" };
      case "task":
        return { icon: "fa-solid fa-list-check", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Task" };
      case "announcement":
        return { icon: "fa-solid fa-bullhorn", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Announcement" };
      case "hr":
      case "leave":
      case "appraisal":
      case "referral":
        return { icon: "fa-solid fa-briefcase", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", label: "HR & Leaves" };
      case "kudos":
        return { icon: "fa-solid fa-wand-magic-sparkles", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20", label: "Kudos" };
      default:
        return { icon: "fa-solid fa-bell", color: "text-primary", bg: "bg-primary/10 border-primary/20", label: type || "Alert" };
    }
  };

  if (!permLoading && !canAccessModule("notifications")) {
    return <AccessRestricted moduleName="Notification Center" icon="fa-solid fa-bell" />;
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in pb-20 sm:pb-12">
      {/* ── 1. Header Banner & Action Bar ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 rounded-2xl border border-primary/20 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-bold text-primary tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Workspace Activity &amp; Live Alerts</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span>Notification Center</span>
            {unreadCount > 0 && (
              <Badge color="primary" className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {unreadCount} Unread
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Live notification stream, team announcements, task assignments, and direct alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(false)}
            disabled={refreshing}
            className="min-h-[38px] text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border"
            title="Refresh alerts feed"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", refreshing && "fa-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Broadcast New Features (Admin / OPS only) */}
          {(isAdmin || isOPS) && (
            <Button
              size="sm"
              onClick={() => setShowFeatureBroadcastModal(true)}
              className="min-h-[38px] text-xs gap-2 font-bold bg-gradient-to-r from-emerald-500 to-[#00c5a0] hover:from-emerald-600 hover:to-[#00b290] text-slate-950 shadow-md rounded-xl cursor-pointer"
            >
              <i className="fa-solid fa-tower-broadcast text-xs" />
              <span>Broadcast New Features</span>
            </Button>
          )}

          {/* Broadcast Announcement */}
          {(isAdmin || isOPS || can("createAnnouncements")) && (
            <Button
              color="warning"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="min-h-[38px] text-xs gap-2 font-semibold shadow-xs rounded-xl cursor-pointer"
            >
              <i className="fa-solid fa-bullhorn text-xs" />
              <span>Broadcast Alert</span>
            </Button>
          )}

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="min-h-[38px] text-xs gap-1.5 font-semibold rounded-xl cursor-pointer"
            >
              <i className="fa-solid fa-check-double text-xs text-primary" />
              <span className="hidden sm:inline">Mark All as Read</span>
            </Button>
          )}

          {/* Clear All History */}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmModal({ isOpen: true, type: "all" })}
              className="min-h-[38px] text-xs gap-1.5 text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
            >
              <i className="fa-solid fa-trash-can text-xs" />
              <span className="hidden sm:inline">Clear History</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Executive Stat Cards (Interactive 1-Click Filters) ─────── */}
      <NotificationStatCards
        totalCount={counts.all}
        unreadCount={counts.unread}
        taskCount={counts.task}
        announcementCount={counts.announcement}
        activeFilter={filterType}
        onSelectFilter={(f) => setFilterType(f as FilterType)}
      />

      {/* ── 3. Filter Bar & Search Hub ────────────────────────────────── */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Category Tabs with dynamic count badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar pb-1">
            {[
              { key: "all", label: "All Alerts", icon: "fa-solid fa-layer-group", count: counts.all },
              { key: "unread", label: "Unread", icon: "fa-solid fa-envelope", count: counts.unread },
              { key: "task", label: "Tasks", icon: "fa-solid fa-list-check", count: counts.task },
              { key: "chat", label: "Chat", icon: "fa-solid fa-comments", count: counts.chat },
              { key: "announcement", label: "Announcements", icon: "fa-solid fa-bullhorn", count: counts.announcement },
              { key: "hr", label: "HR & Leaves", icon: "fa-solid fa-briefcase", count: counts.hr },
              { key: "finance", label: "Finance", icon: "fa-solid fa-file-invoice-dollar", count: counts.finance },
              { key: "kudos", label: "Kudos", icon: "fa-solid fa-wand-magic-sparkles", count: counts.kudos },
              ...((isAdmin || isOPS) ? [{ key: "system", label: "System", icon: "fa-solid fa-gear", count: counts.system }] : []),
              { key: "feature_releases", label: "Feature Releases", icon: "fa-solid fa-sparkles text-amber-500", count: null },
            ].map(({ key, label, icon, count }) => {
              const active = filterType === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterType(key as FilterType)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[36px]",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <i className={cn("text-xs", icon)} />
                  <span>{label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Filters: Search, Status, Time, Per Page, View Mode */}
          {filterType !== "feature_releases" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar with quick-clear and shortcut cue */}
                <div className="relative flex-1 sm:w-64">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search alerts (Ctrl+F)..."
                    className="pl-9 pr-8 h-9 text-xs rounded-xl"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>

                {/* Read Status Dropdown */}
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs min-h-[36px]">
                  <i className="fa-solid fa-filter text-muted-foreground text-[11px]" />
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <select
                    value={readFilter}
                    onChange={(e) => setReadFilter(e.target.value as any)}
                    className="bg-transparent text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-card text-foreground">All Alerts</option>
                    <option value="unread" className="bg-card text-foreground">Unread Only</option>
                    <option value="read" className="bg-card text-foreground">Read Only</option>
                  </select>
                </div>

                {/* Date Range Dropdown */}
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs min-h-[36px]">
                  <i className="fa-solid fa-calendar-days text-muted-foreground text-[11px]" />
                  <span className="font-semibold text-muted-foreground">Time:</span>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="bg-transparent text-foreground font-medium outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-card text-foreground">All Time</option>
                    <option value="today" className="bg-card text-foreground">Today</option>
                    <option value="7days" className="bg-card text-foreground">Past 7 Days</option>
                    <option value="30days" className="bg-card text-foreground">Past 30 Days</option>
                  </select>
                </div>
              </div>

              {/* Right View Controls: Group By Date Toggle & Per-page */}
              <div className="flex items-center gap-2 justify-end">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("flat")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
                      viewMode === "flat" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Flat List View"
                  >
                    <i className="fa-solid fa-list text-[10px]" />
                    <span className="hidden md:inline">List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grouped")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
                      viewMode === "grouped" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Group by Day"
                  >
                    <i className="fa-solid fa-calendar-week text-[10px]" />
                    <span className="hidden md:inline">Timeline</span>
                  </button>
                </div>

                {/* Page Size */}
                <div className="flex items-center gap-1 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border text-xs min-h-[36px]">
                  <span className="text-muted-foreground text-[11px]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-primary"
                  >
                    <option value={10} className="bg-card text-foreground">10</option>
                    <option value={20} className="bg-card text-foreground">20</option>
                    <option value={50} className="bg-card text-foreground">50</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. Main Content Area ───────────────────────────────────────── */}
      {filterType === "feature_releases" ? (
        /* Dedicated Feature Releases Desk */
        <FeatureBroadcastDesk onBroadcastUpdated={() => fetchNotifications(true)} />
      ) : (
        /* Enhanced Notification Stream Card */
        <Card className="border border-border shadow-sm rounded-2xl overflow-hidden">
          {/* Card Header with Select-All & Summary */}
          <CardHeader className="border-b border-border bg-muted/20 py-3 px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="w-8 h-8 -ml-1 sm:ml-0 rounded-lg flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                  title="Select all on this page"
                >
                  {selectedIds.size === paginatedNotifications.length && paginatedNotifications.length > 0 ? (
                    <i className="fa-solid fa-check text-[10px] text-primary" />
                  ) : selectedIds.size > 0 ? (
                    <i className="fa-solid fa-minus text-[10px] text-primary" />
                  ) : null}
                </button>
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-bell text-primary text-xs" />
                  <span>Activity Stream</span>
                </CardTitle>
              </div>

              <CardDescription className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                Showing {filteredNotifications.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
                {Math.min(filteredNotifications.length, currentPage * pageSize)} of {filteredNotifications.length}
              </CardDescription>
            </div>
          </CardHeader>

          {/* Card Content Stream */}
          <CardContent className="p-0 divide-y divide-border/50">
            {loading ? (
              /* Skeleton Loader */
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20 animate-pulse flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedNotifications.length === 0 ? (
              /* Empty State */
              <div className="py-16 text-center space-y-3 p-4">
                <div className="w-16 h-16 rounded-3xl bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <i className="fa-solid fa-bell-slash text-2xl" />
                </div>
                <h3 className="text-base font-bold text-foreground">No alerts found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  No alerts match your current filter criteria. You&apos;re completely up to date with workspace tasks and announcements!
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilterType("all");
                    setReadFilter("all");
                    setDateFilter("all");
                    setSearch("");
                  }}
                  className="text-xs rounded-xl"
                >
                  <i className="fa-solid fa-arrows-rotate text-xs mr-1.5" /> Reset Filters
                </Button>
              </div>
            ) : viewMode === "grouped" ? (
              /* Grouped Timeline View */
              <div className="divide-y divide-border/50">
                {GROUP_ORDER.map((group) => {
                  const items = groupedNotifications[group] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={group} className="space-y-0">
                      <div className="px-4 sm:px-6 py-2 bg-muted/40 border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <i className="fa-solid fa-calendar-day text-primary text-[10px]" />
                        <span>{group}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">({items.length})</span>
                      </div>
                      <div className="divide-y divide-border/40">
                        {items.map((n) => renderNotificationRow(n))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat Stream View */
              paginatedNotifications.map((n) => renderNotificationRow(n))
            )}
          </CardContent>

          {/* Pagination Footer */}
          {filteredNotifications.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-card/60">
              <div className="text-xs text-muted-foreground font-medium">
                Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
                <span className="font-bold text-foreground">{totalPages}</span> ({filteredNotifications.length} items)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs gap-1.5 cursor-pointer rounded-xl"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]" />
                  <span>Prev</span>
                </Button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-xs text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className={cn(
                            "w-8 h-8 p-0 text-xs font-semibold rounded-xl cursor-pointer",
                            currentPage === p ? "bg-primary text-primary-foreground font-bold shadow-xs" : ""
                          )}
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 text-xs gap-1.5 cursor-pointer rounded-xl"
                >
                  <span>Next</span>
                  <i className="fa-solid fa-chevron-right text-[10px]" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── 5. Multi-Select Batch Floating Action Bar ───────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] sm:w-11/12 max-w-lg animate-in slide-in-from-bottom-6 duration-200">
          <div className="bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl shadow-2xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-mono">
                {selectedIds.size}
              </span>
              <span className="text-xs font-semibold text-foreground">
                Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={batchOperating}
                onClick={handleBatchMarkRead}
                className="min-h-[34px] text-xs font-semibold gap-1.5 rounded-xl border-border"
              >
                <i className="fa-solid fa-check-double text-xs text-primary" />
                <span>Mark Read</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={batchOperating}
                onClick={() => setDeleteConfirmModal({ isOpen: true, type: "selected" })}
                className="min-h-[34px] text-xs font-semibold gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <i className="fa-solid fa-trash-can text-xs" />
                <span>Delete</span>
              </Button>

              <button
                type="button"
                onClick={handleDeselectAll}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Deselect all"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Modals ──────────────────────────────────────────────────── */}
      {/* Feature Release Broadcast Desk Modal */}
      {showFeatureBroadcastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-tower-broadcast text-[#00c5a0] text-base" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Feature Release Broadcast Desk
                </h3>
              </div>
              <button
                onClick={() => setShowFeatureBroadcastModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <FeatureBroadcastDesk
                isModal={true}
                onClose={() => setShowFeatureBroadcastModal(false)}
                onBroadcastUpdated={() => fetchNotifications(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 overflow-y-auto overscroll-contain animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500 text-lg" />
                <h3 className="text-base font-bold text-foreground">Broadcast Real-Time Alert</h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Announcement Title</label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. System Maintenance Scheduled for 10 PM"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Message Details</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter message to broadcast to all team members..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Optional Action Link URL</label>
                <Input
                  value={broadcastLink}
                  onChange={(e) => setBroadcastLink(e.target.value)}
                  placeholder="e.g. /dashboard/chat or /dashboard/projects"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBroadcastModal(false)}
                  className="rounded-xl min-h-[38px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  disabled={sendingBroadcast}
                  className="gap-2 font-semibold rounded-xl min-h-[38px]"
                >
                  <i className="fa-solid fa-paper-plane text-xs" />
                  {sendingBroadcast ? "Sending Broadcast..." : "Send Team Alert"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDeleteConfirmModal({ isOpen: false, type: "single" })}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-base" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {deleteConfirmModal.type === "all"
                    ? "Clear All Notifications?"
                    : deleteConfirmModal.type === "selected"
                    ? `Delete ${selectedIds.size} Selected Notifications?`
                    : "Delete Notification?"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {deleteConfirmModal.type === "all"
                    ? "This action will permanently remove all notifications from your history."
                    : deleteConfirmModal.type === "selected"
                    ? `Are you sure you want to delete ${selectedIds.size} selected notifications?`
                    : `Delete "${deleteConfirmModal.title || "this alert"}"?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: "single" })}
                disabled={deleting}
                className="rounded-xl min-h-[38px]"
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={confirmDelete}
                disabled={deleting}
                className="gap-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer min-h-[38px]"
              >
                <i className="fa-solid fa-trash text-xs" />
                {deleting
                  ? "Deleting..."
                  : deleteConfirmModal.type === "all"
                  ? "Clear All History"
                  : deleteConfirmModal.type === "selected"
                  ? "Delete Selected"
                  : "Delete Notification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper row renderer
  function renderNotificationRow(n: NotifItem) {
    const details = getTypeDetails(n.type, n.title);
    const targetUrl = getNotificationTargetUrl(n);
    const isSelected = selectedIds.has(n._id);
    const relativeTime = formatRelativeTime(n.createdAt);

    return (
      <div
        key={n._id}
        onClick={() => handleMarkSingleRead(n._id, targetUrl || undefined)}
        className={cn(
          "p-3.5 sm:p-4 transition-all cursor-pointer hover:bg-primary/5 flex items-start justify-between gap-3 group border-l-4",
          !n.read
            ? "bg-[#00c5a0]/5 dark:bg-[#00c5a0]/10 border-l-[#00c5a0]"
            : "border-l-transparent opacity-85 hover:opacity-100",
          isSelected ? "bg-primary/10" : ""
        )}
      >
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Multi-Select Checkbox with enlarged touch target */}
          <button
            type="button"
            onClick={(e) => handleToggleSelect(e, n._id)}
            className="w-8 h-8 -ml-1 sm:ml-0 shrink-0 flex items-center justify-center cursor-pointer transition-transform active:scale-95 mt-1 sm:mt-0.5"
            title="Select notification"
          >
            <div
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 text-transparent"
              )}
            >
              <i className="fa-solid fa-check text-[9px]" />
            </div>
          </button>

          {/* Category Icon Badge */}
          <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border shadow-2xs", details.bg)}>
            <i className={cn(details.icon, details.color, "text-sm sm:text-base")} />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs sm:text-sm font-bold truncate", !n.read ? "text-foreground" : "text-muted-foreground")}>
                {n.title}
              </span>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-[#00c5a0] animate-pulse shrink-0" />
              )}
              <Badge variant="outline" className="text-[10px] capitalize px-2 py-0 border-border">
                {details.label}
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {relativeTime}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {n.message}
            </p>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground/80">
                <i className="fa-solid fa-clock text-[9px]" />
                {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>

              {targetUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkSingleRead(n._id, targetUrl);
                  }}
                  className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 transition-all text-[11px]"
                >
                  <span>Open Target</span>
                  <i className="fa-solid fa-arrow-right text-[9px]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hover / Touch Quick Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Toggle Read/Unread Status Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleToggleSingleRead(e, n._id, n.read)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            title={n.read ? "Mark as unread" : "Mark as read"}
          >
            <i className={cn("fa-solid text-xs", n.read ? "fa-envelope" : "fa-envelope-open")} />
          </Button>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmModal({
                isOpen: true,
                type: "single",
                id: n._id,
                title: n.title,
              });
            }}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg cursor-pointer"
            title="Delete notification"
          >
            <i className="fa-solid fa-trash text-xs" />
          </Button>
        </div>
      </div>
    );
  }
}
