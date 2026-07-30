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

interface NotifItem {
  _id: string;
  title: string;
  message: string;
  type: "chat" | "announcement" | "task" | "system";
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "task" | "chat" | "announcement">("all");

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

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/notifications?clearAll=true", { method: "DELETE" });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Clear all notifications error:", err);
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

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterType === "unread" && n.read) return false;
      if (filterType === "task" && n.type !== "task") return false;
      if (filterType === "chat" && n.type !== "chat") return false;
      if (filterType === "announcement" && n.type !== "announcement") return false;

      if (search) {
        const query = search.toLowerCase();
        return n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
      }
      return true;
    });
  }, [notifications, filterType, search]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chat":
        return "fa-solid fa-message text-sky-500 bg-sky-500/10";
      case "task":
        return "fa-solid fa-list-check text-emerald-500 bg-emerald-500/10";
      case "announcement":
        return "fa-solid fa-bullhorn text-amber-500 bg-amber-500/10";
      default:
        return "fa-solid fa-bell text-primary bg-primary/10";
    }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading Notification Center..." />;
  }

  const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager";

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
          {isAdminOrManager && (
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
              onClick={handleClearAll}
              className="gap-2 text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <i className="fa-solid fa-trash-can text-xs" /> Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Control Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none">
            {(["all", "unread", "task", "chat", "announcement"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap",
                  filterType === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {key === "all" ? "All Alerts" : key}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="pl-9 h-9 text-xs"
            />
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
            <CardDescription className="text-xs">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border/50">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <i className="fa-solid fa-bell-slash text-4xl text-muted-foreground/40 block mx-auto" />
              <p className="text-base font-semibold text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No alerts match your current filter settings. You're all caught up with your workspace activities!
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleMarkSingleRead(n._id, n.linkUrl)}
                className={cn(
                  "p-4 transition-all cursor-pointer hover:bg-accent/40 flex items-start justify-between gap-4 group",
                  !n.read ? "bg-primary/5 font-medium" : "opacity-85"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl shrink-0 mt-0.5 flex items-center justify-center w-10 h-10", getTypeIcon(n.type))}>
                    <i className={cn(getTypeIcon(n.type).split(" ")[0], getTypeIcon(n.type).split(" ")[1], "text-base")} />
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

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <i className="fa-solid fa-clock text-[10px]" />
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      {n.linkUrl && (
                        <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                          <i className="fa-solid fa-arrow-right text-[10px]" /> Open link
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(n._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                  title="Delete notification"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
