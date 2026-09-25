"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, getNotificationTargetUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NativeService } from "@/lib/native/nativeService";

export interface NotificationBellProps {
  onOpen?: () => void;
}

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

export function NotificationBell({ onOpen }: NotificationBellProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time live toast alert state
  const [latestToast, setLatestToast] = useState<NotifItem | null>(null);
  const [toastProgress, setToastProgress] = useState(100);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  // Login catch-up toast state
  const [catchUpCount, setCatchUpCount] = useState(0);
  const [showCatchUp, setShowCatchUp] = useState(false);

  // Desktop notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLink, setBroadcastLink] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (pillsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = pillsRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const scrollPills = (direction: "left" | "right") => {
    if (pillsRef.current) {
      const offset = direction === "left" ? -140 : 140;
      pillsRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 300);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401 || res.status === 403) return;

      if (res.ok) {
        const data = await res.json();
        const freshNotifs: NotifItem[] = data.notifications || [];
        const freshUnread: number = data.unreadCount || 0;

        if (isFirstFetchRef.current) {
          // On login / page load: show catch-up toast only if there are unread notifications
          // and the user hasn't already dismissed them, unless new updates arrived since dismissal.
          isFirstFetchRef.current = false;
          prevIdsRef.current = new Set(freshNotifs.map((n) => n._id));
          setNotifications(freshNotifs);
          setUnreadCount(freshUnread);

          if (freshUnread > 0) {
            let shouldShow = true;
            try {
              if (typeof window !== "undefined") {
                const key = `nexace_catchup_dismissed_${user?._id || "default"}`;
                const raw = localStorage.getItem(key);
                if (raw) {
                  const dismissed = JSON.parse(raw);
                  const latestFresh = freshNotifs[0];
                  const latestFreshTime = latestFresh?.createdAt ? new Date(latestFresh.createdAt).getTime() : 0;
                  const dismissedTime = dismissed.latestCreatedAt ? new Date(dismissed.latestCreatedAt).getTime() : 0;
                  const hasNewerNotif = latestFresh && latestFresh._id !== dismissed.latestId && latestFreshTime > dismissedTime;
                  const countIncreased = freshUnread > (dismissed.unreadCount ?? 0);

                  // If no newer notification arrived and unread count did not increase, user already dismissed this batch
                  if (!hasNewerNotif && !countIncreased) {
                    shouldShow = false;
                  }
                }
              }
            } catch {
              // ignore storage errors
            }

            if (shouldShow) {
              setCatchUpCount(freshUnread);
              setShowCatchUp(true);
            }
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
          NativeService.haptic("medium");

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

  // Sync permission state on mount and when panel opens
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(window.Notification.permission);
  }, [open]);

  const handleRequestPermission = async () => {
    // Native Capacitor app uses its own push flow — skip browser API entirely
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await window.Notification.requestPermission();
      setNotifPermission(result);
    } catch { /* ignore */ }
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


  // Auto-dismiss live toast after 6 seconds + animate progress bar
  useEffect(() => {
    if (!latestToast) return;
    setToastProgress(100);
    const DURATION = 6000;
    const TICK = 60;
    const step = (TICK / DURATION) * 100;
    const interval = setInterval(() => setToastProgress((p) => Math.max(0, p - step)), TICK);
    const timer = setTimeout(() => { setLatestToast(null); setToastProgress(100); }, DURATION);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [latestToast]);

  const recordCatchUpDismissal = (targetNotifs?: NotifItem[], targetCount?: number) => {
    try {
      if (typeof window !== "undefined") {
        const key = `nexace_catchup_dismissed_${user?._id || "default"}`;
        const notifList = targetNotifs !== undefined ? targetNotifs : notifications;
        const latest = notifList[0];
        const record = {
          latestId: latest?._id || null,
          latestCreatedAt: latest?.createdAt || null,
          unreadCount: targetCount !== undefined ? targetCount : unreadCount,
          dismissedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(record));
      }
    } catch {
      // ignore
    }
  };

  const handleDismissCatchUp = () => {
    setShowCatchUp(false);
    recordCatchUpDismissal();
  };

  // Auto-dismiss catch-up toast after 8 seconds
  useEffect(() => {
    if (showCatchUp) {
      const timer = setTimeout(() => {
        setShowCatchUp(false);
        recordCatchUpDismissal();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showCatchUp]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      // Delay slightly for modal mount/paint
      const timer = setTimeout(checkScroll, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

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

  const handleMarkSingleRead = async (n: NotifItem) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: n._id }),
      });
      setNotifications((prev) => prev.map((item) => (item._id === n._id ? { ...item, read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark single read error:", err);
    }
    const targetUrl = getNotificationTargetUrl(n);
    if (targetUrl) {
      setOpen(false);
      router.push(targetUrl);
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
          if (!open) onOpen?.();
          setOpen(!open);
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
        {/* Subtle warning indicator when desktop notifications not enabled */}
        {unreadCount === 0 && notifPermission === "default" && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-background" title="Enable desktop alerts" />
        )}
      </Button>

      {/* ── Login Catch-Up Toast ── */}
      {showCatchUp && !open && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-5 sm:top-5 z-[300] sm:max-w-sm bg-card border-2 border-primary/40 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 bg-gradient-to-r from-card via-card to-primary/5">
          <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
            <i className="fa-solid fa-inbox text-base text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs text-foreground">Welcome back!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have <span className="text-primary font-bold">{catchUpCount}</span> unread notification{catchUpCount !== 1 ? "s" : ""} since your last visit.
            </p>
            <button
              onClick={() => { handleDismissCatchUp(); setOpen(true); }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-2 cursor-pointer"
            >
              View All <i className="fa-solid fa-arrow-right text-[10px]" />
            </button>
          </div>
          <button onClick={handleDismissCatchUp} className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* ── Live Real-time Toast Banner ── */}
      {latestToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-5 sm:top-5 z-[200] sm:max-w-sm bg-card border border-primary/30 text-foreground rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-3 overflow-hidden">
          {/* Progress bar */}
          <div
            className="h-0.5 bg-primary transition-all duration-[60ms] ease-linear"
            style={{ width: `${toastProgress}%` }}
          />
          <div className="p-4 flex items-start gap-3 bg-gradient-to-r from-card via-card to-primary/5">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", getTypeCfg(latestToast.type).bg)}>
              <i className={cn(getTypeCfg(latestToast.type).icon, getTypeCfg(latestToast.type).color, "text-sm")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{getTypeCfg(latestToast.type).label}</p>
                  <p className="font-bold text-xs text-foreground mt-0.5 truncate">{latestToast.title}</p>
                </div>
                <button onClick={() => setLatestToast(null)} className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer shrink-0 mt-0.5">
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{latestToast.message}</p>
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
        </div>
      )}

      {/* ── Notifications Dropdown Panel (Portal-rendered so it's never trapped inside sidebar transforms) ── */}
      {open && mounted && createPortal(
        <>
          {/* Backdrop for outside click */}
          <div
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className="fixed z-[9999] inset-x-3 top-14 sm:top-16 max-w-sm sm:max-w-md mx-auto md:inset-x-auto md:right-6 md:top-16 md:w-[26rem] bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] sm:max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#232d3b] bg-slate-50/90 dark:bg-[#1a222d] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <i className="fa-solid fa-bolt text-amber-500 text-xs shrink-0 animate-pulse" />
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-[#00c5a0]/15 text-[#00c5a0] px-2 py-0.5 rounded-full font-bold shrink-0">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn(
                    "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                    soundEnabled ? "text-[#00c5a0] hover:bg-[#00c5a0]/10" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232d3b]"
                  )}
                  title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to enable)"}
                >
                  <i className={cn("fa-solid", soundEnabled ? "fa-volume-high" : "fa-volume-xmark")} />
                </button>

                {isAdminOrManager && (
                  <button
                    onClick={() => { setOpen(false); setShowBroadcastModal(true); }}
                    className="text-xs text-amber-500 hover:text-amber-600 font-semibold flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2 py-1 rounded-lg transition-colors"
                    title="Broadcast to team"
                  >
                    <i className="fa-solid fa-bullhorn text-[11px]" />
                    <span className="hidden sm:inline">Broadcast</span>
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#00c5a0] hover:underline font-medium flex items-center gap-1 cursor-pointer px-1.5 py-1"
                    title="Mark all as read"
                  >
                    <i className="fa-solid fa-check-double text-xs" />
                    <span className="hidden sm:inline">Mark All</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232d3b] transition-colors cursor-pointer ml-0.5"
                  title="Close"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#232d3b] bg-slate-50/50 dark:bg-[#11161d]/50 flex items-center gap-2 shrink-0">
              <i className="fa-solid fa-magnifying-glass text-xs text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs shrink-0 cursor-pointer">
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>

            {/* ── Desktop Permission Banner (web only, permission not yet granted) ── */}
            {notifPermission === "default" && (
              <div className="mx-3 my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 shrink-0 animate-in fade-in slide-in-from-top-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-bell text-amber-500 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Enable Desktop Alerts</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Get instant pop-ups for tasks, chats &amp; announcements even when this tab is in the background.</p>
                  <button
                    onClick={handleRequestPermission}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <i className="fa-solid fa-check text-[10px]" /> Allow Notifications
                  </button>
                </div>
                <button
                  onClick={() => setNotifPermission("denied")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>
            )}

            {/* ── Denied State Banner ── */}
            {notifPermission === "denied" && (
              <div className="mx-3 my-2 p-3 rounded-xl bg-slate-100 dark:bg-[#1a222d] border border-slate-200 dark:border-[#232d3b] flex items-center gap-2.5 shrink-0">
                <i className="fa-solid fa-bell-slash text-slate-400 text-sm shrink-0" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Desktop alerts are blocked. To enable, click the <strong>🔒 lock icon</strong> in your browser address bar → Notifications → Allow.
                </p>
              </div>
            )}

            {/* Filter Sub-Bar with Scroll Indicator & Auto-Centering */}
            <div className="relative border-b border-slate-200 dark:border-[#232d3b] bg-white dark:bg-[#161c24] shrink-0">
              {/* Left Scroll Button / Gradient Cue */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollPills("left")}
                  aria-label="Scroll left"
                  className="absolute left-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-r from-white via-white/90 to-transparent dark:from-[#161c24] dark:via-[#161c24]/90 dark:to-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-opacity"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]" />
                </button>
              )}

              {/* Scrollable Pills List */}
              <div
                ref={pillsRef}
                onScroll={checkScroll}
                className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scroll-smooth no-scrollbar scrollbar-none overscroll-x-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_PILLS.map(({ key, label, icon }) => {
                  const isActive = filterType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        setFilterType(key);
                        e.currentTarget.scrollIntoView({
                          behavior: "smooth",
                          inline: "center",
                          block: "nearest",
                        });
                        setTimeout(checkScroll, 300);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 active:scale-95 select-none",
                        isActive
                          ? "bg-[#00c5a0] text-slate-950 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232d3b] hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <i className={cn(icon, "text-[10px]")} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Right Scroll Button / Gradient Cue */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollPills("right")}
                  aria-label="Scroll right"
                  className="absolute right-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-l from-white via-white/90 to-transparent dark:from-[#161c24] dark:via-[#161c24]/90 dark:to-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-opacity"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]" />
                </button>
              )}
            </div>

            {/* Notification List — grouped by date */}
            <div className="flex-1 max-h-[48vh] sm:max-h-[22rem] overflow-y-auto divide-y divide-slate-100 dark:divide-[#232d3b]/50">
              {orderedGroups.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 space-y-2">
                  <i className="fa-solid fa-bell-slash text-3xl mx-auto block opacity-30 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No notifications found</p>
                  <p className="text-xs text-slate-400">You&apos;re all caught up!</p>
                </div>
              ) : (
                orderedGroups.map((group) => (
                  <div key={group}>
                    {/* Date Group Header */}
                    <div className="px-4 py-1.5 bg-slate-50 dark:bg-[#1a222d] border-y border-slate-200/60 dark:border-[#232d3b]/60 sticky top-0 z-10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{group}</span>
                    </div>

                    {/* Notifications in group */}
                    <div className="divide-y divide-slate-100 dark:divide-[#232d3b]/40">
                      {grouped[group].map((n) => {
                        const cfg = getTypeCfg(n.type);
                        return (
                          <div
                            key={n._id}
                            onClick={() => handleMarkSingleRead(n)}
                            className={cn(
                              "p-3.5 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e2632] group relative flex items-start gap-3",
                              !n.read ? "bg-[#00c5a0]/5 dark:bg-[#00c5a0]/8" : "opacity-80"
                            )}
                          >
                            {/* Type icon */}
                            <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", cfg.bg)}>
                              <i className={cn(cfg.icon, cfg.color, "text-sm")} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between mb-0.5 gap-2">
                                <span className={cn("text-xs font-semibold line-clamp-1 pr-1", !n.read ? "text-slate-900 dark:text-white font-bold" : "text-slate-600 dark:text-slate-400")}>
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 break-words">{n.message}</p>
                              {/* Unread dot */}
                              {!n.read && (
                                <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-[#00c5a0]" />
                              )}
                            </div>

                            {/* Delete on hover */}
                            <button
                              onClick={(e) => handleDeleteNotification(e, n._id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
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
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-[#232d3b] bg-slate-50/80 dark:bg-[#1a222d] text-xs shrink-0">
              {notifications.length > 0 ? (
                <button
                  onClick={handleClearAll}
                  className="text-rose-500 hover:text-rose-600 hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-trash-can text-[10px]" /> Clear All
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <i className="fa-solid fa-circle text-[6px] text-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              )}

              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/notifications");
                }}
                className="text-[#00c5a0] hover:text-[#00b08e] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>View Full History</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Broadcast Modal (Admin / Manager / OPS only) — also Portal-rendered ── */}
      {showBroadcastModal && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#232d3b] pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500 text-lg" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-time Team Broadcast</h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Announcement Title</label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Q3 All-Hands Meeting Starting Soon"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Details</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter the broadcast message that will pop up on all team members screens..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c5a0] resize-y"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Optional Action Link URL</label>
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
        </div>,
        document.body
      )}
    </div>
  );
}
