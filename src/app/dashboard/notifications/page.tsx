"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Preloader } from "@/components/ui/Preloader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface NotifItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "unread" | "task" | "chat" | "announcement" | "hr" | "kudos" | "system"
  >("all");

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: "single" | "all";
    id?: string;
    title?: string;
  }>({ isOpen: false, type: "single" });
  const [deleting, setDeleting] = useState(false);

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
      }
    } catch (err) {
      console.error("Delete notification error:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirmModal({ isOpen: false, type: "single" });
    }
  };

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
        fetchNotifications();
      }
    } catch (err) {
      console.error("Send broadcast error:", err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
      if (filterType === "hr" && n.type !== "hr" && n.type !== "leave" && n.type !== "appraisal" && n.type !== "referral") return false;
      if (filterType === "kudos" && n.type !== "kudos") return false;
      if (filterType === "system" && n.type !== "system" && n.type !== "okr") return false;

      // Read status filter
      if (readFilter === "unread" && n.read) return false;
      if (readFilter === "read" && !n.read) return false;

      // Date range filter
      const createdDate = new Date(n.createdAt);
      if (dateFilter === "today" && createdDate < startOfToday) return false;
      if (dateFilter === "7days" && createdDate < sevenDaysAgo) return false;
      if (dateFilter === "30days" && createdDate < thirtyDaysAgo) return false;

      if (search) {
        const query = search.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
      }
      return true;
    });
  }, [notifications, filterType, readFilter, dateFilter, search]);

  // Reset to Page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, readFilter, dateFilter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  const getTypeDetails = (type: string) => {
    switch (type) {
      case "chat":
        return { icon: "fa-solid fa-comments", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" };
      case "task":
        return { icon: "fa-solid fa-list-check", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
      case "announcement":
        return { icon: "fa-solid fa-bullhorn", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
      case "hr":
      case "leave":
      case "appraisal":
      case "referral":
        return { icon: "fa-solid fa-briefcase", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" };
      case "kudos":
        return { icon: "fa-solid fa-wand-magic-sparkles", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
      default:
        return { icon: "fa-solid fa-bell", color: "text-primary", bg: "bg-primary/10 border-primary/20" };
    }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading Notification Center..." />;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase mb-1">
            <i className="fa-solid fa-bolt text-primary text-sm animate-pulse" /> Real-time Workspace Alerts
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Notification Center
            {unreadCount > 0 && (
              <Badge color="primary" className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} Unread
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live notification stream, team announcements, task assignments, and direct alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(isAdmin || isOPS || can("createAnnouncements")) && (
            <Button
              color="warning"
              size="sm"
              onClick={() => setShowBroadcastModal(true)}
              className="gap-2 font-semibold shadow-md cursor-pointer"
            >
              <i className="fa-solid fa-bullhorn text-xs" /> Broadcast Team Announcement
            </Button>
          )}

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2 font-semibold cursor-pointer"
            >
              <i className="fa-solid fa-check-double text-xs" /> Mark All as Read
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmModal({ isOpen: true, type: "all" })}
              className="gap-2 text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <i className="fa-solid fa-trash-can text-xs" /> Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Control Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full scrollbar-none pb-1">
            {(["all", "unread", "task", "chat", "announcement", "hr", "kudos", "system"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  filterType === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <i className={cn("text-[11px]", 
                  key === "all" ? "fa-solid fa-layer-group" :
                  key === "unread" ? "fa-solid fa-envelope" :
                  key === "task" ? "fa-solid fa-list-check" :
                  key === "chat" ? "fa-solid fa-comments" :
                  key === "announcement" ? "fa-solid fa-bullhorn" :
                  key === "hr" ? "fa-solid fa-briefcase" :
                  key === "kudos" ? "fa-solid fa-wand-magic-sparkles" : "fa-solid fa-gear"
                )} />
                <span>{key === "all" ? "All Alerts" : key === "hr" ? "HR & Leaves" : key}</span>
              </button>
            ))}
          </div>

          {/* Sub-Filters: Read Status, Date Range, Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-3">
              {/* Read Status Dropdown */}
              <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
                <i className="fa-solid fa-filter text-muted-foreground text-[11px]" />
                <span className="font-semibold text-muted-foreground">Status:</span>
                <select
                  value={readFilter}
                  onChange={(e) => setReadFilter(e.target.value as any)}
                  className="bg-transparent text-foreground font-medium outline-none cursor-pointer"
                >
                  <option value="all" className="bg-card text-foreground">All Notifications</option>
                  <option value="unread" className="bg-card text-foreground">Unread Only</option>
                  <option value="read" className="bg-card text-foreground">Read Only</option>
                </select>
              </div>

              {/* Date Range Dropdown */}
              <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
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

              {/* Entries Per Page Dropdown (Default 10) */}
              <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
                <i className="fa-solid fa-list-ol text-muted-foreground text-[11px]" />
                <span className="font-semibold text-muted-foreground">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-transparent text-foreground font-bold outline-none cursor-pointer text-primary"
                >
                  <option value={10} className="bg-card text-foreground">10 per page</option>
                  <option value={20} className="bg-card text-foreground">20 per page</option>
                  <option value={50} className="bg-card text-foreground">50 per page</option>
                  <option value={100} className="bg-card text-foreground">100 per page</option>
                </select>
              </div>

              {/* Active Filter Clear Button */}
              {(filterType !== "all" || readFilter !== "all" || dateFilter !== "all" || search || pageSize !== 10) && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setReadFilter("all");
                    setDateFilter("all");
                    setPageSize(10);
                    setSearch("");
                  }}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1 cursor-pointer px-2 py-1"
                >
                  <i className="fa-solid fa-xmark text-[10px]" /> Reset Filters
                </button>
              )}
            </div>

            {/* Keyword Search Box */}
            <div className="relative w-full sm:w-64">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-list text-muted-foreground text-xs" /> Notification Logs
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Showing {filteredNotifications.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
              {Math.min(filteredNotifications.length, currentPage * pageSize)} of {filteredNotifications.length} entries (Default 10/page)
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/50">
          {paginatedNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <i className="fa-solid fa-bell-slash text-4xl text-muted-foreground/40 block mx-auto" />
              <p className="text-base font-semibold text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No alerts match your current filter settings. You're all caught up with your workspace activities!
              </p>
            </div>
          ) : (
            paginatedNotifications.map((n) => {
              const details = getTypeDetails(n.type);
              const targetUrl = n.linkUrl && n.linkUrl !== "/dashboard/tasks" ? n.linkUrl : n.type === "task" ? "/dashboard/hr?tab=tasks" : n.linkUrl || "/dashboard/hr?tab=tasks";

              return (
                <div
                  key={n._id}
                  onClick={() => handleMarkSingleRead(n._id, targetUrl)}
                  className={cn(
                    "p-4 transition-all cursor-pointer hover:bg-primary/5 flex items-start justify-between gap-4 group border-l-4",
                    !n.read ? "bg-primary/10 border-l-primary font-medium" : "border-l-transparent opacity-85"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Clean Icon Container */}
                    <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 border shadow-xs", details.bg)}>
                      <i className={cn(details.icon, details.color, "text-base")} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold truncate", !n.read ? "text-foreground" : "text-muted-foreground")}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <Badge variant="outline" className="text-[10px] capitalize px-2 py-0">
                          {n.type}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>

                      <div className="flex items-center gap-4 pt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <i className="fa-solid fa-clock text-[10px]" />
                          {new Date(n.createdAt).toLocaleString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkSingleRead(n._id, targetUrl);
                          }}
                          className="text-primary font-semibold hover:underline flex items-center gap-1.5 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-md border border-primary/20 transition-all"
                        >
                          <span>Open Task / Action</span>
                          <i className="fa-solid fa-arrow-right text-[10px]" />
                        </button>
                      </div>
                    </div>
                  </div>

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
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                    title="Delete notification"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Pagination Footer Controls */}
        {filteredNotifications.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-card/60">
            <div className="text-xs text-muted-foreground font-medium">
              Showing page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
              <span className="font-bold text-foreground">{totalPages}</span> ({filteredNotifications.length} total entries)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[10px]" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-xs text-muted-foreground">...</span>}
                        <Button
                          variant={currentPage === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className={cn("h-8 w-8 text-xs p-0 cursor-pointer", currentPage === p && "font-bold shadow-xs")}
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDeleteConfirmModal({ isOpen: false, type: "single" })}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-xl" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {deleteConfirmModal.type === "all" ? "Clear Notification History?" : "Delete Notification?"}
                </h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-border">
              {deleteConfirmModal.type === "all"
                ? "Are you sure you want to delete all notification log entries from your history?"
                : `Are you sure you want to delete '${deleteConfirmModal.title || "this notification"}'?`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: "single" })}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmDelete}
                disabled={deleting}
                className="gap-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm cursor-pointer border-0"
              >
                <i className="fa-solid fa-trash text-xs" />
                {deleting
                  ? "Deleting..."
                  : deleteConfirmModal.type === "all"
                  ? "Clear All History"
                  : "Delete Notification"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
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
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  disabled={sendingBroadcast}
                  className="gap-2 font-semibold"
                >
                  <i className="fa-solid fa-paper-plane text-xs" />
                  {sendingBroadcast ? "Sending Broadcast..." : "Send Team Alert"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
