"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NotifItem {
  _id: string;
  title: string;
  message: string;
  type: "chat" | "announcement" | "task" | "system";
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "unread" | "task" | "chat" | "announcement">("all");
  
  // Real-time live toast alert state
  const [latestToast, setLatestToast] = useState<NotifItem | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401 || res.status === 403) return;

      if (res.ok) {
        const data = await res.json();
        const freshNotifs: NotifItem[] = data.notifications || [];
        const freshUnread: number = data.unreadCount || 0;

        // Check if new unread notification arrived for live toast notification
        if (prevIdsRef.current.size > 0) {
          const newlyAdded = freshNotifs.find(
            (n) => !n.read && !prevIdsRef.current.has(n._id)
          );
          if (newlyAdded) {
            setLatestToast(newlyAdded);
            // Play notification chime using Web Audio API
            playChimeSound();

            // Trigger Browser Native OS Desktop Notification if permission granted
            if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
              try {
                new window.Notification(newlyAdded.title, {
                  body: newlyAdded.message,
                });
              } catch {
                // Ignore desktop notification errors
              }
            }
          }
        }

        // Update previous IDs set
        prevIdsRef.current = new Set(freshNotifs.map((n) => n._id));
        setNotifications(freshNotifs);
        setUnreadCount(freshUnread);
      }
    } catch {
      // Quietly swallow fetch errors
    }
  };

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Fast real-time polling interval (every 4 seconds)
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => setLatestToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-dismiss live toast popup after 6 seconds
  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => setLatestToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

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
      setOpen(false);
      router.push(linkUrl);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
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

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "unread") return !n.read;
    if (filterType === "task") return n.type === "task";
    if (filterType === "chat") return n.type === "chat";
    if (filterType === "announcement") return n.type === "announcement";
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chat":
        return "fa-solid fa-message text-sky-500";
      case "task":
        return "fa-solid fa-list-check text-emerald-500";
      case "announcement":
        return "fa-solid fa-bullhorn text-amber-500";
      default:
        return "fa-solid fa-bell text-primary";
    }
  };

  const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative text-muted-foreground hover:text-foreground h-9 w-9 rounded-full cursor-pointer transition-colors"
        title="Real-time Workspace Notifications"
      >
        <i className="fa-solid fa-bell text-base text-muted-foreground group-hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Floating Live Real-time Toast Banner Popup */}
      {latestToast && (
        <div className="fixed top-16 right-6 z-[999] w-80 sm:w-96 bg-card border border-primary/30 shadow-2xl rounded-xl p-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0 mt-0.5">
                <i className={cn(getTypeIcon(latestToast.type), "text-lg")} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{latestToast.title}</span>
                  <Badge color="primary" variant="soft" className="text-[9px] uppercase px-1.5 py-0">
                    Realtime
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{latestToast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setLatestToast(null)}
              className="text-muted-foreground hover:text-foreground p-1 text-xs shrink-0 cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
          {latestToast.linkUrl && (
            <div className="mt-3 pt-2 border-t border-border/50 flex justify-end">
              <Button
                size="sm"
                color="primary"
                className="h-7 text-[11px] px-3 font-semibold"
                onClick={() => {
                  const url = latestToast.linkUrl;
                  handleMarkSingleRead(latestToast._id);
                  setLatestToast(null);
                  if (url) router.push(url);
                }}
              >
                View Now <i className="fa-solid fa-arrow-right text-[10px] ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Notifications Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bolt text-amber-500 text-xs animate-pulse" />
              <span className="font-semibold text-sm text-foreground">Live Activity & Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAdminOrManager && (
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowBroadcastModal(true);
                  }}
                  className="text-xs text-amber-500 hover:text-amber-600 font-semibold flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2 py-1 rounded-md transition-colors"
                  title="Broadcast to team"
                >
                  <i className="fa-solid fa-bullhorn text-[11px]" /> Broadcast
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <i className="fa-solid fa-check-double text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Sub-Bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 bg-card overflow-x-auto text-[11px] font-medium scrollbar-none">
            {(["all", "unread", "task", "chat", "announcement"] as const).map((typeKey) => (
              <button
                key={typeKey}
                onClick={() => setFilterType(typeKey)}
                className={cn(
                  "px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap",
                  filterType === typeKey
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {typeKey}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground space-y-2">
                <i className="fa-solid fa-bell-slash text-3xl mx-auto block opacity-40 text-muted-foreground" />
                <p className="text-sm font-medium">No notifications found.</p>
                <p className="text-xs text-muted-foreground/80">You're all caught up with your workspace alerts!</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkSingleRead(n._id, n.linkUrl)}
                  className={cn(
                    "p-3.5 transition-colors cursor-pointer hover:bg-accent/50 group relative flex items-start gap-3",
                    !n.read ? "bg-primary/5 font-medium" : "opacity-80"
                  )}
                >
                  <div className="p-2 bg-accent/60 rounded-lg shrink-0 mt-0.5">
                    <i className={cn(getTypeIcon(n.type), "text-sm")} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-semibold truncate pr-2", !n.read ? "text-foreground font-bold" : "text-muted-foreground")}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                  </div>

                  {/* Delete Item Button on Hover */}
                  <button
                    onClick={(e) => handleDeleteNotification(e, n._id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                    title="Delete notification"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs">
              <button
                onClick={handleClearAll}
                className="text-destructive hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-trash-can text-[10px]" /> Clear All
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">Realtime Live Sync Active</span>
            </div>
          )}
        </div>
      )}

      {/* Real-time Floating Live Toast Banner */}
      {latestToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-sm w-full bg-card border-2 border-primary/50 text-foreground p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-start gap-3 bg-gradient-to-r from-card via-card to-primary/5">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <i className="fa-solid fa-bell text-base animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-xs text-foreground truncate">{latestToast.title}</p>
              <button
                onClick={() => setLatestToast(null)}
                className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestToast.message}</p>
            {latestToast.linkUrl && (
              <a
                href={latestToast.linkUrl}
                onClick={() => setLatestToast(null)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-2"
              >
                View Details <i className="fa-solid fa-arrow-right text-[10px]" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal for Admins/Managers */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500 text-lg" />
                <h3 className="text-base font-bold text-foreground">Real-time Team Broadcast</h3>
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
                  placeholder="e.g. Q3 All-Hands Meeting Starting Soon"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Message Details</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter the broadcast message that will pop up on all team members' screens..."
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
                  {sendingBroadcast ? "Sending Broadcast..." : "Send Team Notification"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
