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
  type: "chat" | "announcement" | "task" | "leave" | "hr" | "appraisal" | "kudos" | "okr" | "referral" | "system";
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

type FilterType = "all" | "unread" | "task" | "chat" | "announcement" | "leave" | "hr" | "kudos" | "system";

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  chat:         { icon: "fa-solid fa-message",         color: "text-sky-500",     bg: "bg-sky-500/10",     label: "Chat" },
  task:         { icon: "fa-solid fa-list-check",      color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Task" },
  announcement: { icon: "fa-solid fa-bullhorn",         color: "text-amber-500",   bg: "bg-amber-500/10",   label: "Announce" },
  leave:        { icon: "fa-solid fa-calendar-xmark",  color: "text-rose-500",    bg: "bg-rose-500/10",    label: "Leave" },
  hr:           { icon: "fa-solid fa-briefcase-medical",color: "text-pink-500",    bg: "bg-pink-500/10",    label: "HR" },
  appraisal:    { icon: "fa-solid fa-star",             color: "text-yellow-500",  bg: "bg-yellow-500/10",  label: "Appraisal" },
  kudos:        { icon: "fa-solid fa-hands-clapping",  color: "text-violet-500",  bg: "bg-violet-500/10",  label: "Kudos" },
  okr:          { icon: "fa-solid fa-bullseye",         color: "text-indigo-500",  bg: "bg-indigo-500/10",  label: "OKR" },
  referral:     { icon: "fa-solid fa-link",             color: "text-lime-500",    bg: "bg-lime-500/10",    label: "Referral" },
  system:       { icon: "fa-solid fa-bell",             color: "text-primary",     bg: "bg-primary/10",     label: "System" },
};

const FILTER_PILLS: { key: FilterType; label: string; icon: string }[] = [
  { key: "all",          label: "All",         icon: "fa-solid fa-layer-group" },
  { key: "unread",       label: "Unread",      icon: "fa-solid fa-circle-dot" },
  { key: "task",         label: "Tasks",       icon: "fa-solid fa-list-check" },
  { key: "chat",         label: "Chat",        icon: "fa-solid fa-message" },
  { key: "announcement", label: "Announcements",icon: "fa-solid fa-bullhorn" },
  { key: "leave",        label: "Leave",       icon: "fa-solid fa-calendar-xmark" },
  { key: "hr",           label: "HR",          icon: "fa-solid fa-briefcase-medical" },
  { key: "kudos",        label: "Kudos",       icon: "fa-solid fa-hands-clapping" },
  { key: "system",       label: "System",      icon: "fa-solid fa-gear" },
];

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

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Real-time live toast alert state
  const [latestToast, setLatestToast] = useState<NotifItem | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  // Login catch-up toast state
  const [catchUpCount, setCatchUpCount] = useState(0);
  const [showCatchUp, setShowCatchUp] = useState(false);

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

        if (isFirstFetchRef.current) {
          // On login: show catch-up toast if there are unread notifications
          isFirstFetchRef.current = false;
          prevIdsRef.current = new Set(freshNotifs.map((n) => n._id));
          setNotifications(freshNotifs);
          setUnreadCount(freshUnread);
          if (freshUnread > 0) {
            setCatchUpCount(freshUnread);
            setShowCatchUp(true);
          }
          return;
        }

        // Subsequent polls: detect newly arrived notifications
        const newlyAdded = freshNotifs.find(
          (n) => !n.read && !prevIdsRef.current.has(n._id)
        );
        if (newlyAdded) {
          setLatestToast(newlyAdded);
          playChimeSound();

          // Native OS desktop notification
          if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
            try {
              new window.Notification(newlyAdded.title, { body: newlyAdded.message });
            } catch { /* ignore */ }
          }
        }

        prevIdsRef.current = new Set(freshNotifs.map((n) => n._id));
        setNotifications(freshNotifs);
        setUnreadCount(freshUnread);
      }
    } catch {
      // Quietly swallow fetch errors
    }
  };

  // Sound toggle preference
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const requestDesktopPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default") {
      try {
        window.Notification.requestPermission().catch(() => {});
      } catch { /* ignore */ }
    }
  };

  const playChimeSound = () => {
    if (!soundEnabled) return;
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
    } catch { /* Audio context may be restricted before user interaction */ }
  };

  useEffect(() => {
    // Don't fetch notifications until the user session is confirmed.
    // This prevents a burst of 401/404 errors immediately after login
    // while the AuthContext is still resolving the session cookie.
    if (!user) return;

    fetchNotifications();

    let intervalId: NodeJS.Timeout;

    const setupPolling = () => {
      clearInterval(intervalId);
      // When tab is hidden, poll every 60s; when active, poll every 15s
      const pollDelay = typeof document !== "undefined" && document.hidden ? 60000 : 15000;
      intervalId = setInterval(fetchNotifications, pollDelay);
    };

    setupPolling();

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        // Tab became active: fetch immediately and resume fast polling
        fetchNotifications();
      }
      setupPolling();
    };

    const handleWindowFocus = () => {
      fetchNotifications();
      setupPolling();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user]); // re-run when user session resolves so polling starts correctly


  // Auto-dismiss live toast after 6 seconds
  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => setLatestToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

  // Auto-dismiss catch-up toast after 8 seconds
  useEffect(() => {
    if (showCatchUp) {
      const timer = setTimeout(() => setShowCatchUp(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showCatchUp]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
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

  // Filter notifications with query support
  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter =
      filterType === "unread"
        ? !n.read
        : filterType === "system"
        ? n.type === "system" || n.type === "appraisal" || n.type === "okr" || n.type === "referral"
        : filterType === "all" || n.type === filterType;

    const matchesQuery = searchQuery
      ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesFilter && matchesQuery;
  });

  // Group by date
  const grouped: Record<string, NotifItem[]> = {};
  filteredNotifications.forEach((n) => {
    const group = getDateGroup(n.createdAt);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(n);
  });
  const orderedGroups = GROUP_ORDER.filter((g) => grouped[g]?.length > 0);

  const getTypeCfg = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.system;
  const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager" || user?.role === "OPS";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen(!open);
          requestDesktopPermission();
        }}
        className="relative text-muted-foreground hover:text-foreground h-9 w-9 rounded-full cursor-pointer transition-colors"
        title="Real-time Workspace Notifications"
      >
        <i className={cn("fa-solid fa-bell text-base text-muted-foreground group-hover:text-foreground", unreadCount > 0 && "animate-[wiggle_0.5s_ease-in-out]")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* ── Login Catch-Up Toast ── */}
      {showCatchUp && !open && (
        <div className="fixed top-5 right-5 z-[300] max-w-sm w-full bg-card border-2 border-primary/40 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 bg-gradient-to-r from-card via-card to-primary/5">
          <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
            <i className="fa-solid fa-inbox text-base text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs text-foreground">Welcome back!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have <span className="text-primary font-bold">{catchUpCount}</span> unread notification{catchUpCount !== 1 ? "s" : ""} since your last visit.
            </p>
            <button
              onClick={() => { setShowCatchUp(false); setOpen(true); }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-2 cursor-pointer"
            >
              View All <i className="fa-solid fa-arrow-right text-[10px]" />
            </button>
          </div>
          <button onClick={() => setShowCatchUp(false)} className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* ── Live Real-time Toast Banner ── */}
      {latestToast && (
        <div className="fixed top-5 right-5 z-[200] max-w-sm w-full bg-card border-2 border-primary/50 text-foreground p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-start gap-3 bg-gradient-to-r from-card via-card to-primary/5">
          <div className={cn("p-2.5 rounded-lg shrink-0", getTypeCfg(latestToast.type).bg)}>
            <i className={cn(getTypeCfg(latestToast.type).icon, getTypeCfg(latestToast.type).color, "text-base")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-xs text-foreground truncate">{latestToast.title}</p>
              <button onClick={() => setLatestToast(null)} className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0">
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

      {/* ── Notifications Dropdown Panel ── */}
      {open && (
        <>
          {/* Backdrop for outside click */}
          <div
            className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />

          <div className="fixed inset-x-3 top-16 max-w-sm sm:max-w-md mx-auto md:absolute md:top-full md:right-0 md:inset-x-auto md:w-[26rem] mt-2 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bolt text-amber-500 text-xs animate-pulse" />
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors cursor-pointer",
                  soundEnabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
                title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to enable)"}
              >
                <i className={cn("fa-solid", soundEnabled ? "fa-volume-high" : "fa-volume-xmark")} />
              </button>

              {isAdminOrManager && (
                <button
                  onClick={() => { setOpen(false); setShowBroadcastModal(true); }}
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
                  <i className="fa-solid fa-check-double text-xs" /> Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass text-xs text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground text-xs">
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Filter Sub-Bar */}
          <div className="flex items-center gap-1 px-2 py-2 border-b border-border/50 bg-card overflow-x-auto scrollbar-none">
            {FILTER_PILLS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1",
                  filterType === key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <i className={cn(icon, "text-[10px]")} />
                {label}
              </button>
            ))}
          </div>

          {/* Notification List — grouped by date */}
          <div className="max-h-[22rem] overflow-y-auto">
            {orderedGroups.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground space-y-2">
                <i className="fa-solid fa-bell-slash text-3xl mx-auto block opacity-30" />
                <p className="text-sm font-medium">No notifications found.</p>
                <p className="text-xs text-muted-foreground/70">You&apos;re all caught up!</p>
              </div>
            ) : (
              orderedGroups.map((group) => (
                <div key={group}>
                  {/* Date Group Header */}
                  <div className="px-4 py-1.5 bg-muted/40 border-y border-border/40 sticky top-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group}</span>
                  </div>

                  {/* Notifications in group */}
                  <div className="divide-y divide-border/30">
                    {grouped[group].map((n) => {
                      const cfg = getTypeCfg(n.type);
                      return (
                        <div
                          key={n._id}
                          onClick={() => handleMarkSingleRead(n._id, n.linkUrl)}
                          className={cn(
                            "p-3.5 transition-colors cursor-pointer hover:bg-accent/50 group relative flex items-start gap-3",
                            !n.read ? "bg-primary/5" : "opacity-75"
                          )}
                        >
                          {/* Type icon */}
                          <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", cfg.bg)}>
                            <i className={cn(cfg.icon, cfg.color, "text-sm")} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between mb-0.5 gap-2">
                              <span className={cn("text-xs font-semibold line-clamp-1 pr-1", !n.read ? "text-foreground font-bold" : "text-muted-foreground")}>
                                {n.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                            {/* Unread dot */}
                            {!n.read && (
                              <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                          </div>

                          {/* Delete on hover */}
                          <button
                            onClick={(e) => handleDeleteNotification(e, n._id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/40 text-xs">
            {notifications.length > 0 ? (
              <button
                onClick={handleClearAll}
                className="text-destructive hover:underline font-medium text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-trash-can text-[10px]" /> Clear All
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1">
                <i className="fa-solid fa-circle text-[6px] text-emerald-500 animate-pulse" />
                Live Sync
              </span>
            )}

            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/notifications");
              }}
              className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <span>View Full History</span>
              <i className="fa-solid fa-arrow-right text-[10px]" />
            </button>
          </div>
        </div>
        </>
      )}

      {/* ── Broadcast Modal (Admin / Manager / OPS only) ── */}
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
                  placeholder="Enter the broadcast message that will pop up on all team members screens..."
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
                <Button type="button" variant="outline" size="sm" onClick={() => setShowBroadcastModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" disabled={sendingBroadcast} className="gap-2 font-semibold">
                  <i className="fa-solid fa-paper-plane text-xs" />
                  {sendingBroadcast ? "Sending..." : "Send Broadcast"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
