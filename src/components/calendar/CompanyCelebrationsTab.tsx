"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WishAttachment {
  url: string;
  name: string;
  type: "image" | "file";
  size?: number;
}

export interface WishReaction {
  userId: string;
  userName: string;
  emoji: string;
  createdAt: string;
}

export interface BirthdayWishItem {
  _id: string;
  recipientId: string;
  recipientName?: string;
  recipientDepartment?: string;
  recipientPhotoUrl?: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  senderDepartment?: string;
  message: string;
  sticker: "cake" | "balloons" | "cheers" | "star" | "gift";
  type: "birthday" | "anniversary";
  attachments: WishAttachment[];
  reactions: WishReaction[];
  year: number;
  acknowledged: boolean;
  createdAt: string;
}

export interface CelebrantItem {
  userId: string;
  name: string;
  photoUrl?: string;
  department: string;
  role: string;
  phone?: string;
  day: number;
  month: number;
  type: "birthday" | "anniversary";
  label: string;
  isToday?: boolean;
  daysRemaining?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const STICKER_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  cake: { icon: "fa-cake-candles", label: "Cake", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  balloons: { icon: "fa-heart", label: "Warmth", color: "text-pink-500 bg-pink-500/10 border-pink-500/30" },
  cheers: { icon: "fa-champagne-glasses", label: "Cheers", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  star: { icon: "fa-star", label: "Star", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" },
  gift: { icon: "fa-gift", label: "Gift", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
};

const PRESET_TEMPLATES = [
  { label: "Joy & Health 🎂", text: "Wishing you a wonderful birthday filled with joy, laughter, and great health! May this upcoming year bring immense success and happiness! 🎂✨", sticker: "cake" as const },
  { label: "Team Pillar 🌟", text: "Happy Birthday! Thank you for your leadership, dedication, and positive energy that elevates our entire team. Cheers to reaching new heights! 🌟", sticker: "star" as const },
  { label: "Extra Cake Slice 🎁", text: "Happy Birthday! Take a well-deserved break, enjoy an extra slice of cake, and let someone else answer the urgent emails today! You've earned it! 🎁🥳", sticker: "gift" as const },
  { label: "Bug-Free Day 🎈", text: "Happy Birthday to our resident rockstar! May your day be packed with great vibes, zero bugs, and plenty of reasons to smile! 🎈🍕", sticker: "cheers" as const },
  { label: "Pure Joy 🍰", text: "Wishing you the happiest of birthdays today! May your year ahead be as bright and inspiring as you are! 🍰💛", sticker: "cake" as const },
  { label: "Milestone Cheers 🥂", text: "Happy Work Anniversary! Thank you for your passion, continuous dedication, and exceptional teamwork. Here's to many more milestones together! 🥂🎊", sticker: "cheers" as const },
];

const EMOJI_OPTIONS = ["❤️", "🍰", "🥳", "🙏", "🔥"];

export function CompanyCelebrationsTab({
  onToast,
  initialSelectedUserId,
}: {
  onToast: (msg: string, type?: "success" | "error") => void;
  initialSelectedUserId?: string | null;
}) {
  const { user: currentUser } = useAuth();
  const { isAdmin, isOPS, isHR, role, can } = usePermissions();
  const normalizedRole = (role || "").toLowerCase();
  const canModerate =
    isAdmin ||
    isOPS ||
    isHR ||
    normalizedRole === "admin" ||
    normalizedRole === "ops" ||
    normalizedRole === "hr" ||
    can("manageCelebrations");

  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-11
  const todayDay = now.getDate();

  // Navigation & Sub-View states
  const [activeSubView, setActiveSubView] = useState<"celebrations" | "moderation">("celebrations");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx + 1); // 1-12
  const [typeFilter, setTypeFilter] = useState<"All" | "birthday" | "anniversary">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Celebrant roster & selection
  const [rosterByMonth, setRosterByMonth] = useState<Record<number, CelebrantItem[]>>({});
  const [selectedCelebrant, setSelectedCelebrant] = useState<CelebrantItem | null>(null);
  const [celebrantWishes, setCelebrantWishes] = useState<BirthdayWishItem[]>([]);
  const [wishesLoading, setWishesLoading] = useState(false);

  // Moderation desk feed
  const [allWishesFeed, setAllWishesFeed] = useState<BirthdayWishItem[]>([]);
  const [moderationSearch, setModerationSearch] = useState("");
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Stats & Broadcast
  const [stats, setStats] = useState({
    todayTotal: 0,
    upcomingTotal: 0,
    totalWishes: 0,
    activeCelebrants: 0,
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isThankingAll, setIsThankingAll] = useState(false);
  const [hasThankedAll, setHasThankedAll] = useState(false);

  // Wish Composer State
  const [composerMessage, setComposerMessage] = useState("");
  const [composerSticker, setComposerSticker] = useState<"cake" | "balloons" | "cheers" | "star" | "gift">("cake");
  const [composerAttachments, setComposerAttachments] = useState<WishAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-page photo preview lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 1. Fetch Roster & Stats
  // ─────────────────────────────────────────────────────────────
  const loadRosterAndData = useCallback(async () => {
    try {
      // 1. Fetch general birthday overview & annual 12-month roster
      const bdayRes = await fetch("/api/birthdays");
      let todayList: any[] = [];
      let upcomingList: any[] = [];
      let rosterMap: Record<number, CelebrantItem[]> = {};
      for (let m = 1; m <= 12; m++) rosterMap[m] = [];

      if (bdayRes.ok) {
        const bdayData = await bdayRes.json();
        todayList = [
          ...(bdayData.todayBirthdays || []),
          ...(bdayData.todayAnniversaries || []),
        ];
        upcomingList = [
          ...(bdayData.upcomingBirthdays || []),
          ...(bdayData.upcomingAnniversaries || []),
        ];

        if (bdayData.roster) {
          Object.keys(bdayData.roster).forEach((monthKey) => {
            const mNum = parseInt(monthKey, 10);
            rosterMap[mNum] = (bdayData.roster[mNum] || []).map((item: any) => ({
              ...item,
              month: mNum,
              isToday: mNum === currentMonthIdx + 1 && item.day === todayDay,
            }));
          });
        }
      }

      // 2. If elevated role, fetch company-wide wishes moderation feed & stats
      if (canModerate) {
        try {
          const adminRes = await fetch("/api/birthdays/admin");
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            if (Array.isArray(adminData.wishes)) {
              setAllWishesFeed(adminData.wishes);
            }
            if (adminData.roster && Object.keys(adminData.roster).length > 0) {
              Object.keys(adminData.roster).forEach((monthKey) => {
                const mNum = parseInt(monthKey, 10);
                if (Array.isArray(adminData.roster[mNum]) && adminData.roster[mNum].length > 0) {
                  rosterMap[mNum] = adminData.roster[mNum].map((item: any) => ({
                    ...item,
                    month: mNum,
                    isToday: mNum === currentMonthIdx + 1 && item.day === todayDay,
                  }));
                }
              });
            }
            setStats({
              todayTotal: todayList.length,
              upcomingTotal: upcomingList.length,
              totalWishes: adminData.stats?.totalWishes || adminData.wishes?.length || 0,
              activeCelebrants: adminData.stats?.activeUsers || 0,
            });
          }
        } catch (adminErr) {
          console.warn("Admin wishes feed unavailable:", adminErr);
        }
      } else {
        setStats({
          todayTotal: todayList.length,
          upcomingTotal: upcomingList.length,
          totalWishes: 0,
          activeCelebrants: todayList.length + upcomingList.length,
        });
      }

      setRosterByMonth(rosterMap);

      // Auto-select initial celebrant
      const activeMonthList = rosterMap[selectedMonth] || [];
      if (initialSelectedUserId) {
        let found: CelebrantItem | null = null;
        for (let m = 1; m <= 12; m++) {
          const match = (rosterMap[m] || []).find((c) => c.userId === initialSelectedUserId);
          if (match) {
            found = match;
            setSelectedMonth(m);
            break;
          }
        }
        if (found) setSelectedCelebrant(found);
        else if (activeMonthList.length > 0) setSelectedCelebrant(activeMonthList[0]);
      } else if (activeMonthList.length > 0) {
        // Auto-select today's celebrant or first in month
        const todayItem = activeMonthList.find((c) => c.isToday) || activeMonthList[0];
        setSelectedCelebrant((prev) => {
          if (prev && activeMonthList.some((c) => c.userId === prev.userId)) return prev;
          return todayItem;
        });
      }
    } catch (err) {
      console.error("Failed to load celebrations roster:", err);
      onToast("Unable to load celebration roster", "error");
    }
  }, [canModerate, currentMonthIdx, initialSelectedUserId, onToast, selectedMonth, todayDay]);

  useEffect(() => {
    loadRosterAndData();
  }, [loadRosterAndData]);

  // ─────────────────────────────────────────────────────────────
  // 2. Fetch Wishes for Selected Celebrant
  // ─────────────────────────────────────────────────────────────
  const loadCelebrantWishes = useCallback(async (targetUserId: string) => {
    setWishesLoading(true);
    try {
      const res = await fetch(`/api/birthdays/wish?recipientId=${targetUserId}`);
      if (res.ok) {
        const data = await res.json();
        setCelebrantWishes(data.wishes || []);
      } else {
        setCelebrantWishes([]);
      }
    } catch (err) {
      console.error("Failed to fetch celebrant wishes:", err);
      setCelebrantWishes([]);
    } finally {
      setWishesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCelebrant?.userId) {
      loadCelebrantWishes(selectedCelebrant.userId);
    } else {
      setCelebrantWishes([]);
    }
  }, [selectedCelebrant?.userId, loadCelebrantWishes]);

  // ─────────────────────────────────────────────────────────────
  // 3. Celebrant Filtering
  // ─────────────────────────────────────────────────────────────
  const filteredCelebrants = useMemo(() => {
    const list = rosterByMonth[selectedMonth] || [];
    return list.filter((item) => {
      const matchType = typeFilter === "All" || item.type === typeFilter;
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [rosterByMonth, selectedMonth, typeFilter, searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // 4. File Attachment Upload Handler
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (composerAttachments.length + files.length > 4) {
      onToast("Maximum 4 photo attachments allowed per wish", "error");
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          onToast(`"${file.name}" exceeds 5MB limit`, "error");
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/birthdays/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setComposerAttachments((prev) => [
            ...prev,
            {
              url: data.url,
              name: file.name,
              type: file.type.startsWith("image/") ? "image" : "file",
              size: file.size,
            },
          ]);
        } else {
          onToast(`Failed to upload ${file.name}`, "error");
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
      onToast("Photo upload failed", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setComposerAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Submit Wish
  // ─────────────────────────────────────────────────────────────
  const handleSubmitWish = async () => {
    if (!selectedCelebrant) return;
    if (!composerMessage.trim()) {
      onToast("Please write a celebration message first", "error");
      return;
    }

    setIsSubmittingWish(true);
    try {
      const res = await fetch("/api/birthdays/wish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedCelebrant.userId,
          message: composerMessage.trim(),
          sticker: composerSticker,
          type: selectedCelebrant.type,
          attachments: composerAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || "Failed to post celebration wish", "error");
        return;
      }

      onToast("Your celebration wish has been posted! 🎉", "success");
      setComposerMessage("");
      setComposerAttachments([]);
      // Reload wish wall
      loadCelebrantWishes(selectedCelebrant.userId);
      // Reload admin feed if elevated
      if (canModerate) loadRosterAndData();
    } catch (err) {
      console.error("Submit wish error:", err);
      onToast("Failed to post wish. Please try again.", "error");
    } finally {
      setIsSubmittingWish(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Delete Wish (Inline Moderation - Zero Popups)
  // ─────────────────────────────────────────────────────────────
  const handleDeleteWish = async (wishId: string) => {
    setDeletingWishId(wishId);
    try {
      const res = await fetch(`/api/birthdays/wish?id=${wishId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        onToast(data.error || "Failed to delete wish", "error");
        return;
      }

      onToast("Celebration wish removed successfully", "success");
      setCelebrantWishes((prev) => prev.filter((w) => w._id !== wishId));
      setAllWishesFeed((prev) => prev.filter((w) => w._id !== wishId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Delete wish error:", err);
      onToast("Failed to delete wish", "error");
    } finally {
      setDeletingWishId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Toggle Reaction
  // ─────────────────────────────────────────────────────────────
  const handleToggleReaction = async (wishId: string, emoji: string) => {
    try {
      const res = await fetch("/api/birthdays/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId, emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reactions) {
          setCelebrantWishes((prev) =>
            prev.map((w) => (w._id === wishId ? { ...w, reactions: data.reactions } : w))
          );
        }
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. One-Click Thank All (For Celebrant)
  // ─────────────────────────────────────────────────────────────
  const handleThankAll = async () => {
    setIsThankingAll(true);
    try {
      const res = await fetch("/api/birthdays/thank-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: "Thank you so much everyone for the wonderful wishes and love! It means the world to me! ❤️✨",
        }),
      });

      if (res.ok) {
        onToast("Sent thank-you messages to everyone who wished you! ❤️", "success");
        setHasThankedAll(true);
        if (selectedCelebrant?.userId) loadCelebrantWishes(selectedCelebrant.userId);
      } else {
        const data = await res.json();
        onToast(data.error || "Failed to send thank-you notes", "error");
      }
    } catch (err) {
      console.error("Thank all error:", err);
      onToast("Failed to thank colleagues", "error");
    } finally {
      setIsThankingAll(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 9. One-Click Broadcast to Chat (Admin/OPS/HR)
  // ─────────────────────────────────────────────────────────────
  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/birthdays/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceToday: true }),
      });

      const data = await res.json();
      if (res.ok) {
        onToast(data.message || "Celebration cards broadcast to company chat! 📣", "success");
      } else {
        onToast(data.error || "Broadcast failed", "error");
      }
    } catch (err) {
      console.error("Broadcast error:", err);
      onToast("Failed to broadcast celebrations", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const currentUserId = currentUser?._id || (currentUser as any)?.userId;
  const isWishingSelf = Boolean(currentUserId && selectedCelebrant && currentUserId === selectedCelebrant.userId);
  const isCelebrantToday = selectedCelebrant?.isToday;

  return (
    <div className="space-y-6">
      {/* ── Top Header & Stats Strip ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
              <i className="fa-solid fa-cake-candles text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Celebrations & Culture Hub
              </h2>
              <p className="text-xs text-muted-foreground">
                In-page employee birthdays, milestone work anniversaries, peer wishes, and moderation desk.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls for Admin/OPS/HR */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canModerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBroadcast}
              disabled={isBroadcasting}
              className="min-h-[40px] text-xs font-bold gap-2 text-primary border-primary/40 bg-primary/5 hover:bg-primary/15 shadow-xs cursor-pointer"
            >
              <i className={cn("fa-solid", isBroadcasting ? "fa-spinner fa-spin" : "fa-bullhorn")} />
              {isBroadcasting ? "Broadcasting..." : "Broadcast Today's Cards"}
            </Button>
          )}

          {/* Sub-view switcher for elevated roles */}
          {canModerate && (
            <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
              <button
                onClick={() => setActiveSubView("celebrations")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px]",
                  activeSubView === "celebrations"
                    ? "bg-card text-foreground shadow-xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-cake-candles text-xs text-amber-500" />
                <span>Celebrants & Wall</span>
              </button>
              <button
                onClick={() => setActiveSubView("moderation")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px]",
                  activeSubView === "moderation"
                    ? "bg-card text-foreground shadow-xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-shield-halved text-xs text-rose-500" />
                <span>Wishes Moderation</span>
                {allWishesFeed.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/15 text-rose-500 font-extrabold">
                    {allWishesFeed.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Today's Celebrations</span>
            <i className="fa-solid fa-cake-candles text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">{stats.todayTotal}</div>
          <p className="text-[11px] text-muted-foreground">Active celebrants today</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Upcoming (14 Days)</span>
            <i className="fa-solid fa-calendar-check text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-500">{stats.upcomingTotal}</div>
          <p className="text-[11px] text-muted-foreground">Birthdays & anniversaries ahead</p>
        </div>

        <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>In {MONTH_NAMES[selectedMonth - 1]}</span>
            <i className="fa-solid fa-calendar-days text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-500">
            {(rosterByMonth[selectedMonth] || []).length}
          </div>
          <p className="text-[11px] text-muted-foreground">Total roster this month</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Wishes Exchanged</span>
            <i className="fa-solid fa-comments text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {stats.totalWishes || celebrantWishes.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Peer greetings this year</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 1: CELEBRANTS & IN-PAGE WISH WALL
      ───────────────────────────────────────────────────────────── */}
      {activeSubView === "celebrations" && (
        <div className="space-y-6">
          {/* Month Strip Selector: Jan to Dec */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Filter Celebrations by Month:</span>
              <span className="text-primary font-semibold">
                Viewing {MONTH_NAMES[selectedMonth - 1]}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {SHORT_MONTHS.map((shortName, idx) => {
                const monthNum = idx + 1;
                const isSelected = selectedMonth === monthNum;
                const isRealCurrentMonth = idx === currentMonthIdx;
                const count = (rosterByMonth[monthNum] || []).length;

                return (
                  <button
                    key={shortName}
                    onClick={() => {
                      setSelectedMonth(monthNum);
                      const list = rosterByMonth[monthNum] || [];
                      if (list.length > 0) setSelectedCelebrant(list[0]);
                    }}
                    className={cn(
                      "flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[38px] border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 font-extrabold scale-102"
                        : isRealCurrentMonth
                        ? "bg-primary/10 text-primary border-primary/40 font-bold"
                        : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border"
                    )}
                  >
                    <span>{shortName}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {isRealCurrentMonth && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual-Panel In-Page View: Left = Celebrants Roster, Right = Wish Wall & Composer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Left Column: Celebrant Roster (5 Cols) ── */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="p-4 border-border/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search celebrant or dept..."
                      className="pl-8 text-xs h-9 min-h-[36px]"
                    />
                  </div>
                  {/* Type Filter Pills */}
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-lg shrink-0">
                    <button
                      onClick={() => setTypeFilter("All")}
                      className={cn(
                        "px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                        typeFilter === "All" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTypeFilter("birthday")}
                      className={cn(
                        "px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1",
                        typeFilter === "birthday" ? "bg-card text-amber-500 shadow-2xs font-extrabold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <i className="fa-solid fa-cake-candles text-[10px]" /> B'day
                    </button>
                    <button
                      onClick={() => setTypeFilter("anniversary")}
                      className={cn(
                        "px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1",
                        typeFilter === "anniversary" ? "bg-card text-purple-500 shadow-2xs font-extrabold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <i className="fa-solid fa-award text-[10px]" /> Anniv
                    </button>
                  </div>
                </div>

                {/* Celebrants List */}
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredCelebrants.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl border-border/80 space-y-2">
                      <i className="fa-solid fa-calendar-xmark text-2xl text-muted-foreground/60" />
                      <p className="text-xs font-semibold text-muted-foreground">
                        No celebrations recorded for {MONTH_NAMES[selectedMonth - 1]}.
                      </p>
                    </div>
                  ) : (
                    filteredCelebrants.map((celebrant) => {
                      const isSelected = selectedCelebrant?.userId === celebrant.userId;
                      const isBirthday = celebrant.type === "birthday";

                      return (
                        <div
                          key={`${celebrant.userId}_${celebrant.type}_${celebrant.day}`}
                          onClick={() => setSelectedCelebrant(celebrant)}
                          className={cn(
                            "p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-2xs",
                            isSelected
                              ? "bg-primary/10 border-primary ring-2 ring-primary/30 shadow-md scale-[1.01]"
                              : celebrant.isToday
                              ? "bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/15"
                              : "bg-card hover:bg-muted/70 border-border"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {celebrant.photoUrl ? (
                                <Image
                                  src={celebrant.photoUrl}
                                  alt={celebrant.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
                                  {celebrant.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </div>
                              )}
                              <span
                                className={cn(
                                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-2xs border border-card",
                                  isBirthday ? "bg-amber-500 text-white" : "bg-purple-500 text-white"
                                )}
                              >
                                <i className={cn("fa-solid", isBirthday ? "fa-cake-candles" : "fa-award")} />
                              </span>
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-foreground truncate">{celebrant.name}</h4>
                                {celebrant.isToday && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-amber-950 uppercase tracking-wider animate-pulse">
                                    TODAY!
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {celebrant.department} · {celebrant.role}
                              </p>
                              <div className="text-[10px] font-semibold text-primary/80 mt-0.5 flex items-center gap-1">
                                <i className="fa-regular fa-calendar text-[9px]" />
                                <span>{MONTH_NAMES[selectedMonth - 1]} {celebrant.day}</span>
                                {celebrant.label && celebrant.type === "anniversary" && (
                                  <span className="text-purple-500">· {celebrant.label}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                isBirthday
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  : "bg-purple-500/10 text-purple-500 border-purple-500/30"
                              )}
                            >
                              Day {celebrant.day}
                            </span>
                            <i className="fa-solid fa-chevron-right text-[10px] text-muted-foreground/60" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* ── Right Column: Wish Wall & In-Page Composer (7 Cols) ── */}
            <div className="lg:col-span-7 space-y-5">
              {selectedCelebrant ? (
                <>
                  {/* Celebrant Profile Banner */}
                  <Card className="p-5 border-border shadow-xs overflow-hidden relative bg-gradient-to-br from-card via-card to-primary/5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {selectedCelebrant.photoUrl ? (
                          <Image
                            src={selectedCelebrant.photoUrl}
                            alt={selectedCelebrant.name}
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-full object-cover border-2 border-primary/40 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary font-black text-base flex items-center justify-center border-2 border-primary/40 shrink-0">
                            {selectedCelebrant.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-extrabold text-foreground truncate">
                              {selectedCelebrant.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-bold gap-1",
                                selectedCelebrant.type === "birthday"
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                  : "bg-purple-500/15 text-purple-500 border-purple-500/30"
                              )}
                            >
                              <i
                                className={cn(
                                  "fa-solid text-[10px]",
                                  selectedCelebrant.type === "birthday" ? "fa-cake-candles" : "fa-award"
                                )}
                              />
                              {selectedCelebrant.type === "birthday" ? "Birthday Celebration" : selectedCelebrant.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedCelebrant.department} · {selectedCelebrant.role}
                          </p>
                          <p className="text-[11px] font-semibold text-primary mt-1 flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar-star text-xs" />
                            <span>
                              {MONTH_NAMES[selectedCelebrant.month - 1]} {selectedCelebrant.day}
                              {selectedCelebrant.isToday ? " (Today! 🎉)" : ""}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Actions: Thank Everyone (if celebrant) or WhatsApp share */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {isWishingSelf && isCelebrantToday && (
                          <Button
                            size="sm"
                            onClick={handleThankAll}
                            disabled={isThankingAll || hasThankedAll}
                            className="text-xs font-bold gap-1.5 bg-rose-500 hover:bg-rose-600 text-white min-h-[38px] shadow-sm cursor-pointer"
                          >
                            <i className="fa-solid fa-heart" />
                            {hasThankedAll ? "Thanked All ❤️" : isThankingAll ? "Sending..." : "Thank Everyone"}
                          </Button>
                        )}

                        {selectedCelebrant.phone && (
                          <a
                            href={`https://wa.me/${selectedCelebrant.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                              `Happy ${selectedCelebrant.type === "birthday" ? "Birthday" : "Work Anniversary"} ${selectedCelebrant.name}! 🎉 Wishing you a fabulous day! ✨`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold min-h-[38px] transition-all shadow-2xs"
                          >
                            <i className="fa-brands fa-whatsapp text-sm" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* ── In-Page Wish Composer (If not viewing self) ── */}
                  {!isWishingSelf ? (
                    <Card className="p-4 border-border shadow-xs space-y-3 bg-card">
                      <div className="flex items-center justify-between pb-2 border-b border-border/70">
                        <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-feather-pointed text-primary" />
                          Send Wish to {selectedCelebrant.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {composerMessage.length}/600 chars
                        </span>
                      </div>

                      {/* Quick Preset Greeting Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Quick Greeting Presets:
                        </span>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {PRESET_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.label}
                              type="button"
                              onClick={() => {
                                setComposerMessage(tmpl.text);
                                setComposerSticker(tmpl.sticker);
                              }}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              {tmpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message Textarea */}
                      <textarea
                        value={composerMessage}
                        onChange={(e) => setComposerMessage(e.target.value.slice(0, 600))}
                        placeholder={`Write your heartfelt ${selectedCelebrant.type === "birthday" ? "birthday" : "anniversary"} wish for ${selectedCelebrant.name}...`}
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none placeholder:text-muted-foreground/60 transition-all"
                      />

                      {/* Sticker Selector & Photo Upload */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                        {/* Stickers */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground">Badge:</span>
                          {Object.entries(STICKER_CONFIG).map(([key, config]) => {
                            const isSelected = composerSticker === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setComposerSticker(key as any)}
                                title={config.label}
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer border",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                                    : "bg-muted text-muted-foreground hover:text-foreground border-border"
                                )}
                              >
                                <i className={cn("fa-solid", config.icon)} />
                              </button>
                            );
                          })}
                        </div>

                        {/* Attachments & Post Button */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            multiple
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || composerAttachments.length >= 4}
                            className="text-xs font-semibold gap-1.5 min-h-[38px] cursor-pointer"
                          >
                            <i className={cn("fa-solid", isUploading ? "fa-spinner fa-spin" : "fa-camera")} />
                            <span>Photo ({composerAttachments.length}/4)</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmitWish}
                            disabled={isSubmittingWish || !composerMessage.trim()}
                            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-h-[38px] shadow-sm cursor-pointer"
                          >
                            <i className={cn("fa-solid", isSubmittingWish ? "fa-spinner fa-spin" : "fa-paper-plane")} />
                            <span>{isSubmittingWish ? "Posting..." : "Post Wish"}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Photo Attachment Previews */}
                      {composerAttachments.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar">
                          {composerAttachments.map((att, idx) => (
                            <div key={idx} className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                              <Image
                                src={att.url}
                                alt={att.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow-sm opacity-90 hover:opacity-100 cursor-pointer"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ) : (
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-xs text-primary font-semibold flex items-center gap-2">
                      <i className="fa-solid fa-wand-magic-sparkles text-sm" />
                      <span>This is your celebration card wall! Browse the wishes and photos shared by your team below.</span>
                    </div>
                  )}

                  {/* ── Wish Wall Feed ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-comments text-primary" />
                        Celebration Wall ({celebrantWishes.length})
                      </h4>
                      {wishesLoading && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <i className="fa-solid fa-spinner fa-spin" /> Loading wishes...
                        </span>
                      )}
                    </div>

                    {wishesLoading ? (
                      <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                        <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
                        <p>Loading celebration wishes...</p>
                      </div>
                    ) : celebrantWishes.length === 0 ? (
                      <div className="p-10 text-center border border-dashed rounded-xl border-border/80 space-y-2 bg-card/60">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-lg">
                          <i className="fa-solid fa-envelope-open-text" />
                        </div>
                        <h5 className="text-xs font-bold text-foreground">No wishes posted yet</h5>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          Be the first to post a cheerful celebration message for {selectedCelebrant.name}!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {celebrantWishes.map((wish) => {
                          const isMine = Boolean(currentUserId && wish.senderId === currentUserId);
                          const isRecipient = Boolean(currentUserId && wish.recipientId === currentUserId);
                          const canDeleteThisWish = isMine || isRecipient || canModerate;
                          const stickerConfig = STICKER_CONFIG[wish.sticker] || STICKER_CONFIG.cake;

                          return (
                            <Card
                              key={wish._id}
                              className="p-4 border-border/80 shadow-2xs space-y-3 hover:border-primary/40 transition-all bg-card"
                            >
                              <div className="flex items-start justify-between gap-3">
                                {/* Sender Avatar & Details */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {wish.senderPhotoUrl ? (
                                    <Image
                                      src={wish.senderPhotoUrl}
                                      alt={wish.senderName}
                                      width={36}
                                      height={36}
                                      className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/20 shrink-0">
                                      {wish.senderName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join("")
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground truncate">
                                        {wish.senderName}
                                      </span>
                                      {isMine && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/15 text-primary font-bold">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {wish.senderDepartment || "Colleague"} · {new Date(wish.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Sticker Badge & Inline Delete Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                                      stickerConfig.color
                                    )}
                                  >
                                    <i className={cn("fa-solid", stickerConfig.icon)} />
                                    <span>{stickerConfig.label}</span>
                                  </span>

                                  {/* Inline Delete Button (Zero Pop-ups) */}
                                  {canDeleteThisWish && (
                                    confirmDeleteId === wish._id ? (
                                      <div className="flex items-center gap-1 animate-in fade-in">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWish(wish._id)}
                                          disabled={deletingWishId === wish._id}
                                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold min-h-[28px] cursor-pointer"
                                        >
                                          {deletingWishId === wish._id ? "Deleting..." : "Confirm Delete"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="px-1.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-semibold min-h-[28px] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(wish._id)}
                                        title="Delete or moderate wish"
                                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer"
                                      >
                                        <i className="fa-solid fa-trash-can text-xs" />
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Message Content */}
                              <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pl-1 border-l-2 border-primary/20">
                                {wish.message}
                              </div>

                              {/* Attached Photos */}
                              {wish.attachments && wish.attachments.length > 0 && (
                                <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
                                  {wish.attachments.map((att, attIdx) => (
                                    <div
                                      key={attIdx}
                                      onClick={() => setPreviewImage(att.url)}
                                      className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border cursor-pointer group shadow-2xs"
                                    >
                                      <Image
                                        src={att.url}
                                        alt={att.name || "Attachment"}
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                                        <i className="fa-solid fa-magnifying-glass-plus" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reactions Strip */}
                              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {EMOJI_OPTIONS.map((emoji) => {
                                    const count = (wish.reactions || []).filter((r) => r.emoji === emoji).length;
                                    const hasReacted = Boolean(
                                      currentUserId &&
                                      (wish.reactions || []).some((r) => r.userId === currentUserId && r.emoji === emoji)
                                    );

                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleToggleReaction(wish._id, emoji)}
                                        className={cn(
                                          "px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1 border min-h-[26px]",
                                          hasReacted
                                            ? "bg-primary/15 border-primary/40 text-primary font-bold shadow-2xs"
                                            : "bg-muted/60 hover:bg-muted text-muted-foreground border-transparent"
                                        )}
                                      >
                                        <span>{emoji}</span>
                                        {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center border rounded-xl border-dashed border-border space-y-2 bg-card">
                  <i className="fa-solid fa-cake-candles text-3xl text-muted-foreground/60" />
                  <h4 className="text-sm font-bold text-foreground">Select a Celebrant</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose a team member from the roster on the left to view their celebration wall or post a wish.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 2: ADMIN / OPS / HR WISHES MODERATION DESK
      ───────────────────────────────────────────────────────────── */}
      {activeSubView === "moderation" && canModerate && (
        <Card className="p-5 border-border shadow-xs space-y-4 bg-card">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-rose-500" />
                Company-Wide Wishes Moderation Desk
              </h3>
              <p className="text-xs text-muted-foreground">
                Audit, inspect, and remove peer celebration wishes across all company departments.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <Input
                value={moderationSearch}
                onChange={(e) => setModerationSearch(e.target.value)}
                placeholder="Search sender, recipient, message..."
                className="pl-8 text-xs h-9 min-h-[36px]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Sender</th>
                  <th className="p-3">Message Preview</th>
                  <th className="p-3">Type & Badge</th>
                  <th className="p-3">Media</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allWishesFeed
                  .filter((w) => {
                    if (!moderationSearch.trim()) return true;
                    const q = moderationSearch.toLowerCase();
                    return (
                      (w.recipientName || "").toLowerCase().includes(q) ||
                      w.senderName.toLowerCase().includes(q) ||
                      w.message.toLowerCase().includes(q)
                    );
                  })
                  .map((wish) => {
                    const stickerConfig = STICKER_CONFIG[wish.sticker] || STICKER_CONFIG.cake;

                    return (
                      <tr key={wish._id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            {wish.recipientPhotoUrl ? (
                              <Image
                                src={wish.recipientPhotoUrl}
                                alt={wish.recipientName || "Recipient"}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                                {(wish.recipientName || "R")[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-foreground">{wish.recipientName || "Recipient"}</div>
                              <div className="text-[10px] text-muted-foreground">{wish.recipientDepartment}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {wish.senderPhotoUrl ? (
                              <Image
                                src={wish.senderPhotoUrl}
                                alt={wish.senderName}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                                {wish.senderName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground">{wish.senderName}</div>
                              <div className="text-[10px] text-muted-foreground">{wish.senderDepartment}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 max-w-xs">
                          <p className="truncate text-foreground/90" title={wish.message}>
                            {wish.message}
                          </p>
                        </td>

                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", stickerConfig.color)}>
                            <i className={cn("fa-solid mr-1", stickerConfig.icon)} />
                            {wish.type}
                          </span>
                        </td>

                        <td className="p-3">
                          {wish.attachments && wish.attachments.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-500 border border-sky-500/30 font-bold">
                              {wish.attachments.length} photo{wish.attachments.length > 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="p-3 text-muted-foreground text-[11px]">
                          {new Date(wish.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-3 text-right">
                          {confirmDeleteId === wish._id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteWish(wish._id)}
                                disabled={deletingWishId === wish._id}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold min-h-[30px] cursor-pointer"
                              >
                                {deletingWishId === wish._id ? "Deleting..." : "Confirm Delete"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold min-h-[30px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDeleteId(wish._id)}
                              className="text-xs text-rose-500 hover:text-white hover:bg-rose-600 border-rose-500/30 min-h-[32px] gap-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                              <span>Delete</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── In-Page Photo Preview Modal / Lightbox ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl overflow-hidden p-2 shadow-2xl space-y-2 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-2 pt-1">
              <span className="text-xs font-bold text-foreground">Attached Photo Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden rounded-xl">
              <Image
                src={previewImage}
                alt="Enlarged photo preview"
                width={800}
                height={600}
                className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
