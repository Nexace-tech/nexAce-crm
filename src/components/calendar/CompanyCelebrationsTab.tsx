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
import { CelebrationsConfettiCanvas } from "./CelebrationsConfettiCanvas";

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
  wishesCount?: number;
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

export interface AiToneOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  sticker: "cake" | "balloons" | "cheers" | "star" | "gift";
  generateText: (celebrant: CelebrantItem) => string;
}

export const AI_TONE_PRESETS: AiToneOption[] = [
  {
    id: "heartfelt",
    label: "Warm & Heartfelt",
    icon: "fa-heart",
    description: "Sincere and appreciative celebration note",
    sticker: "balloons",
    generateText: (c) => {
      const firstName = c.name.split(" ")[0];
      if (c.type === "birthday") {
        return `Wishing you a truly wonderful and blessed Birthday, ${firstName}! ✨ May this upcoming year be packed with abundant joy, vibrant health, and memorable milestones with your loved ones. You are such an invaluable heart of our ${c.department} team! 🎂❤️`;
      }
      return `Happy Work Anniversary, ${firstName}! 🌟 Celebrating your incredible journey with us in ${c.department}. Thank you for your continued dedication, warmth, and resilience that uplift everyone around you. Here's to many more milestones together! 🥂🎊`;
    },
  },
  {
    id: "cheerful",
    label: "Fun & Cheerful",
    icon: "fa-champagne-glasses",
    description: "Light-hearted, energetic with good vibes",
    sticker: "cheers",
    generateText: (c) => {
      const firstName = c.name.split(" ")[0];
      if (c.type === "birthday") {
        return `Happy Birthday, ${firstName}! 🎈🍕 May your day feature unlimited slices of cake, zero urgent bug escalations, and 100% good vibes! Take a well-deserved moment to celebrate you today! 🥳🎉`;
      }
      return `Cheers to your Work Anniversary, ${firstName}! 🚀 Time flies when you're rocking it in ${c.department}! Thank you for making our workdays so much brighter and more fun. Keep shining! 🍻✨`;
    },
  },
  {
    id: "leadership",
    label: "Leadership & Mentor",
    icon: "fa-star",
    description: "Inspirational, elevating team contributions",
    sticker: "star",
    generateText: (c) => {
      const firstName = c.name.split(" ")[0];
      if (c.type === "birthday") {
        return `Happy Birthday, ${firstName}! 🌟 Thank you for your leadership, exceptional vision, and the positive momentum you consistently bring to ${c.department}. May this year bring your biggest professional and personal triumphs yet! 🏆✨`;
      }
      return `Happy Milestone Anniversary, ${firstName}! 🏆 Your steadfast leadership and dedication have set a high bar of excellence across our entire team. We are deeply grateful for your invaluable contributions and mentorship! 🌟👏`;
    },
  },
  {
    id: "concise",
    label: "Short & Sweet",
    icon: "fa-bolt",
    description: "Quick, energetic and punchy",
    sticker: "gift",
    generateText: (c) => {
      const firstName = c.name.split(" ")[0];
      if (c.type === "birthday") {
        return `Happy Birthday, ${firstName}! 🎂 Wishing you a fantastic day and a brilliant year ahead! Cheers! 🎁✨`;
      }
      return `Happy Work Anniversary, ${firstName}! 🥂 Thank you for being such a stellar teammate in ${c.department}! 🚀`;
    },
  },
];

const PRESET_TEMPLATES = [
  { label: "Joy & Health 🎂", text: "Wishing you a wonderful birthday filled with joy, laughter, and great health! May this upcoming year bring immense success and happiness! 🎂✨", sticker: "cake" as const },
  { label: "Team Pillar 🌟", text: "Happy Birthday! Thank you for your leadership, dedication, and positive energy that elevates our entire team. Cheers to reaching new heights! 🌟", sticker: "star" as const },
  { label: "Extra Cake Slice 🎁", text: "Happy Birthday! Take a well-deserved break, enjoy an extra slice of cake, and let someone else answer the urgent emails today! You've earned it! 🎁🥳", sticker: "gift" as const },
  { label: "Bug-Free Day 🎈", text: "Happy Birthday to our resident rockstar! May your day be packed with great vibes, zero bugs, and plenty of reasons to smile! 🎈🍕", sticker: "cheers" as const },
  { label: "Pure Joy 🍰", text: "Wishing you the happiest of birthdays today! May your year ahead be as bright and inspiring as you are! 🍰💛", sticker: "cake" as const },
  { label: "Milestone Cheers 🥂", text: "Happy Work Anniversary! Thank you for your passion, continuous dedication, and exceptional teamwork. Here's to many more milestones together! 🥂🎊", sticker: "cheers" as const },
];

const EMOJI_OPTIONS = ["❤️", "🍰", "🥳", "🙏", "🔥"];

export const WHATSAPP_EMOJIS = [
  "🎂", "🍰", "🧁", "🎉", "🎊", "🥳", "🎈", "🎁",
  "✨", "🌟", "⭐", "🥂", "🍾", "🍻", "💐", "❤️",
  "💖", "👏", "🙏", "🤗", "🔥", "🚀", "👑", "🏆",
  "💯", "😊", "🤩", "🍕", "🍫", "🍩", "🌹", "🌞",
];

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
  const [onlyNeedsWish, setOnlyNeedsWish] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileActiveView, setMobileActiveView] = useState<"roster" | "detail">("roster");

  // Celebrant roster & selection
  const [rosterByMonth, setRosterByMonth] = useState<Record<number, CelebrantItem[]>>({});
  const [selectedCelebrant, setSelectedCelebrant] = useState<CelebrantItem | null>(null);
  const [celebrantWishes, setCelebrantWishes] = useState<BirthdayWishItem[]>([]);
  const [wishesLoading, setWishesLoading] = useState(false);

  // Moderation desk feed & advanced controls
  const [allWishesFeed, setAllWishesFeed] = useState<BirthdayWishItem[]>([]);
  const [moderationSearch, setModerationSearch] = useState("");
  const [moderationFilterType, setModerationFilterType] = useState<"all" | "birthday" | "anniversary">("all");
  const [moderationFilterMedia, setModerationFilterMedia] = useState<"all" | "photos" | "text">("all");
  const [moderationFilterYear, setModerationFilterYear] = useState<"all" | "current" | "prior">("all");
  const [moderationSortBy, setModerationSortBy] = useState<"newest" | "oldest" | "reactions">("newest");
  const [moderationViewMode, setModerationViewMode] = useState<"table" | "cards">("table");
  const [selectedWishIds, setSelectedWishIds] = useState<string[]>([]);
  const [inspectingWish, setInspectingWish] = useState<BirthdayWishItem | null>(null);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedReactorWishId, setExpandedReactorWishId] = useState<string | null>(null);

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

  // Confetti Particle Explosion Trigger
  const [confettiTrigger, setConfettiTrigger] = useState<number | null>(null);

  // AI Wish Drafter Drawer
  const [isAiDrafterOpen, setIsAiDrafterOpen] = useState(false);

  // WhatsApp Message Customizer State
  const [isWhatsAppCustomizerOpen, setIsWhatsAppCustomizerOpen] = useState(false);
  const [whatsAppCustomMessage, setWhatsAppCustomMessage] = useState("");
  const [whatsAppCustomPhone, setWhatsAppCustomPhone] = useState("");
  const [whatsAppAttachments, setWhatsAppAttachments] = useState<WishAttachment[]>([]);
  const [isWhatsAppUploading, setIsWhatsAppUploading] = useState(false);
  const whatsAppFileInputRef = useRef<HTMLInputElement>(null);
  const whatsAppTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Wish Composer State
  const [composerMessage, setComposerMessage] = useState("");
  const [composerSticker, setComposerSticker] = useState<"cake" | "balloons" | "cheers" | "star" | "gift">("cake");
  const [composerAttachments, setComposerAttachments] = useState<WishAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In-page photo preview lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // In-page commemorative keepsake card preview modal
  const [isKeepsakeModalOpen, setIsKeepsakeModalOpen] = useState(false);

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
              wishesCount: typeof item.wishesCount === "number" ? item.wishesCount : 0,
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
            const feed = Array.isArray(adminData.wishesFeed)
              ? adminData.wishesFeed
              : Array.isArray(adminData.wishes)
              ? adminData.wishes
              : [];
            setAllWishesFeed(feed);

            if (adminData.roster && Object.keys(adminData.roster).length > 0) {
              Object.keys(adminData.roster).forEach((monthKey) => {
                const mNum = parseInt(monthKey, 10);
                if (Array.isArray(adminData.roster[mNum]) && adminData.roster[mNum].length > 0) {
                  rosterMap[mNum] = adminData.roster[mNum].map((item: any) => ({
                    ...item,
                    month: mNum,
                    isToday: mNum === currentMonthIdx + 1 && item.day === todayDay,
                    wishesCount: typeof item.wishesCount === "number" ? item.wishesCount : 0,
                  }));
                }
              });
            }
            setStats({
              todayTotal: todayList.length,
              upcomingTotal: upcomingList.length,
              totalWishes: adminData.stats?.totalWishes || feed.length || 0,
              activeCelebrants: adminData.stats?.activeUsers || adminData.stats?.totalTeamMembers || 0,
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
    setIsWhatsAppCustomizerOpen(false);
    setWhatsAppAttachments([]);
  }, [selectedCelebrant?.userId, loadCelebrantWishes]);

  // ─────────────────────────────────────────────────────────────
  // 3. Celebrant Filtering & Inclusivity Metrics
  // ─────────────────────────────────────────────────────────────
  const unwishedTodayCount = useMemo(() => {
    const list = rosterByMonth[selectedMonth] || [];
    return list.filter((item) => item.isToday && (!item.wishesCount || item.wishesCount === 0)).length;
  }, [rosterByMonth, selectedMonth]);

  const currentMonthCelebrants = useMemo(() => {
    return rosterByMonth[selectedMonth] || [];
  }, [rosterByMonth, selectedMonth]);

  const bdayCountInMonth = useMemo(() => {
    return currentMonthCelebrants.filter((c) => c.type === "birthday").length;
  }, [currentMonthCelebrants]);

  const annivCountInMonth = useMemo(() => {
    return currentMonthCelebrants.filter((c) => c.type === "anniversary").length;
  }, [currentMonthCelebrants]);

  const filteredCelebrants = useMemo(() => {
    const list = currentMonthCelebrants;
    return list.filter((item) => {
      const matchType = typeFilter === "All" || item.type === typeFilter;
      const matchNeedsWish = !onlyNeedsWish || (!item.wishesCount || item.wishesCount === 0);
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchNeedsWish && matchQuery;
    });
  }, [currentMonthCelebrants, typeFilter, onlyNeedsWish, searchQuery]);

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
  // 5. Submit Wish (With Confetti Explosion & Immediate Counter Update)
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

      // Trigger celebratory confetti explosion!
      setConfettiTrigger(Date.now());

      // Optimistically increment wish count on active celebrant & roster
      setSelectedCelebrant((prev) => (prev ? { ...prev, wishesCount: (prev.wishesCount || 0) + 1 } : prev));
      if (selectedCelebrant) {
        const targetUserId = selectedCelebrant.userId;
        const targetType = selectedCelebrant.type;
        const m = selectedCelebrant.month;
        setRosterByMonth((prev) => {
          if (!prev[m]) return prev;
          return {
            ...prev,
            [m]: prev[m].map((c) =>
              c.userId === targetUserId && c.type === targetType
                ? { ...c, wishesCount: (c.wishesCount || 0) + 1 }
                : c
            ),
          };
        });
      }

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
      setSelectedWishIds((prev) => prev.filter((id) => id !== wishId));
      if (inspectingWish?._id === wishId) setInspectingWish(null);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Delete wish error:", err);
      onToast("Failed to delete wish", "error");
    } finally {
      setDeletingWishId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Advanced Moderation Filter & Selection Utilities
  // ─────────────────────────────────────────────────────────────
  const filteredModerationWishes = useMemo(() => {
    const q = moderationSearch.trim().toLowerCase();
    const currentYear = new Date().getFullYear();

    return allWishesFeed
      .filter((wish) => {
        // Universal search matching
        if (q) {
          const recipient = (wish.recipientName || "").toLowerCase();
          const recipientDept = (wish.recipientDepartment || "").toLowerCase();
          const sender = (wish.senderName || "").toLowerCase();
          const senderDept = (wish.senderDepartment || "").toLowerCase();
          const msg = (wish.message || "").toLowerCase();
          if (
            !recipient.includes(q) &&
            !recipientDept.includes(q) &&
            !sender.includes(q) &&
            !senderDept.includes(q) &&
            !msg.includes(q)
          ) {
            return false;
          }
        }

        // Event Type Filter
        if (moderationFilterType !== "all" && wish.type !== moderationFilterType) {
          return false;
        }

        // Media Filter
        const hasPhotos = Array.isArray(wish.attachments) && wish.attachments.length > 0;
        if (moderationFilterMedia === "photos" && !hasPhotos) return false;
        if (moderationFilterMedia === "text" && hasPhotos) return false;

        // Year Filter
        const wishYear = wish.year || new Date(wish.createdAt).getFullYear();
        if (moderationFilterYear === "current" && wishYear !== currentYear) return false;
        if (moderationFilterYear === "prior" && wishYear >= currentYear) return false;

        return true;
      })
      .sort((a, b) => {
        if (moderationSortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (moderationSortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (moderationSortBy === "reactions") {
          return (b.reactions?.length || 0) - (a.reactions?.length || 0);
        }
        return 0;
      });
  }, [
    allWishesFeed,
    moderationSearch,
    moderationFilterType,
    moderationFilterMedia,
    moderationFilterYear,
    moderationSortBy,
  ]);

  const moderationKPIs = useMemo(() => {
    const total = allWishesFeed.length;
    const photos = allWishesFeed.filter((w) => Array.isArray(w.attachments) && w.attachments.length > 0).length;
    const reactions = allWishesFeed.reduce((acc, w) => acc + (w.reactions?.length || 0), 0);
    const matches = filteredModerationWishes.length;
    return { total, photos, reactions, matches };
  }, [allWishesFeed, filteredModerationWishes]);

  const handleToggleSelectAll = () => {
    const visibleIds = filteredModerationWishes.map((w) => w._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedWishIds.includes(id));
    if (allSelected) {
      setSelectedWishIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedWishIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectWish = (wishId: string) => {
    setSelectedWishIds((prev) =>
      prev.includes(wishId) ? prev.filter((id) => id !== wishId) : [...prev, wishId]
    );
  };

  const handleBatchDeleteWishes = async () => {
    if (selectedWishIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const res = await fetch("/api/birthdays/wish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedWishIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        onToast(data.error || "Failed to batch delete celebration wishes", "error");
        return;
      }

      const deletedIds: string[] = data.deletedIds || selectedWishIds;
      onToast(`Successfully removed ${deletedIds.length} celebration wish${deletedIds.length > 1 ? "es" : ""}`, "success");
      setAllWishesFeed((prev) => prev.filter((w) => !deletedIds.includes(w._id)));
      setCelebrantWishes((prev) => prev.filter((w) => !deletedIds.includes(w._id)));
      setSelectedWishIds([]);
      setBatchDeleteConfirmOpen(false);
      if (inspectingWish && deletedIds.includes(inspectingWish._id)) {
        setInspectingWish(null);
      }
    } catch (err) {
      console.error("Batch delete wishes error:", err);
      onToast("An error occurred during batch deletion", "error");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleExportModerationCSV = () => {
    if (filteredModerationWishes.length === 0) {
      onToast("No wishes match current filters to export", "error");
      return;
    }

    const headers = [
      "Wish ID",
      "Created Date",
      "Celebration Type",
      "Recipient Name",
      "Recipient Department",
      "Sender Name",
      "Sender Department",
      "Message",
      "Sticker",
      "Photos Count",
      "Reactions Count",
      "Acknowledged",
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredModerationWishes.map((w) => [
      escapeCsv(w._id),
      escapeCsv(new Date(w.createdAt).toISOString()),
      escapeCsv(w.type),
      escapeCsv(w.recipientName || "Recipient"),
      escapeCsv(w.recipientDepartment || ""),
      escapeCsv(w.senderName),
      escapeCsv(w.senderDepartment || ""),
      escapeCsv(w.message),
      escapeCsv(w.sticker),
      escapeCsv(w.attachments?.length || 0),
      escapeCsv(w.reactions?.length || 0),
      escapeCsv(w.acknowledged ? "Yes" : "No"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nexace-wishes-moderation-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast(`Exported ${filteredModerationWishes.length} wishes to CSV`, "success");
  };

  const handleResetFilters = () => {
    setModerationSearch("");
    setModerationFilterType("all");
    setModerationFilterMedia("all");
    setModerationFilterYear("all");
    setModerationSortBy("newest");
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
  // 8. AI Wish Drafter Generator (Zero Popups)
  // ─────────────────────────────────────────────────────────────
  const handleSelectAiTone = (preset: AiToneOption) => {
    if (!selectedCelebrant) return;
    const text = preset.generateText(selectedCelebrant);
    setComposerMessage(text);
    setComposerSticker(preset.sticker);
    setIsAiDrafterOpen(false);
    onToast(`✨ Drafted ${preset.label} wish for ${selectedCelebrant.name}!`, "success");
  };

  // ─────────────────────────────────────────────────────────────
  // 9. Export Digital Keepsake Card (Zero-Popup Print Canvas)
  // ─────────────────────────────────────────────────────────────
  const handleExportKeepsake = () => {
    if (!selectedCelebrant) return;

    // Strict Permission: Only the Birthday user can print the Keepsake card
    const currentUserId = currentUser?._id || (currentUser as any)?.userId || (currentUser as any)?.id;
    const isSelf = Boolean(
      currentUserId &&
      selectedCelebrant &&
      (String(currentUserId) === String(selectedCelebrant.userId) ||
       (currentUser?.email && (selectedCelebrant as any)?.email && currentUser.email === (selectedCelebrant as any)?.email))
    );
    const isBirthdayCelebrant = Boolean(isSelf && selectedCelebrant.type === "birthday");

    if (!isBirthdayCelebrant) {
      onToast("Only the birthday celebrant can export and print their Keepsake Card", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onToast("Please allow popups to open the Keepsake Card", "error");
      return;
    }

    const title = `${selectedCelebrant.name} - Official Birthday Keepsake Card (2026)`;
    const totalReactions = celebrantWishes.reduce((acc, w) => acc + (w.reactions?.length || 0), 0);
    const totalPhotos = celebrantWishes.reduce((acc, w) => acc + (w.attachments?.length || 0), 0);

    const wishesHtml = celebrantWishes.length > 0
      ? celebrantWishes.map((w) => {
        const stickerInfo = STICKER_CONFIG[w.sticker] || STICKER_CONFIG.cake;
        const photoHtml = (w.attachments && w.attachments.length > 0)
          ? `<div class="wish-photos">${w.attachments.map(att => `<img src="${att.url}" class="wish-photo-thumb" alt="attachment" />`).join("")}</div>`
          : "";
        const reactionsHtml = (w.reactions && w.reactions.length > 0)
          ? `<div class="wish-reactions">${Array.from(new Set(w.reactions.map(r => r.emoji))).map(emoji => `<span class="reaction-pill">${emoji} ${w.reactions.filter(r => r.emoji === emoji).length}</span>`).join("")}</div>`
          : "";

        const avatarHtml = w.senderPhotoUrl
          ? `<img src="${w.senderPhotoUrl}" class="sender-avatar-img" alt="${w.senderName}" />`
          : `<div class="sender-avatar-initial">${w.senderName[0]}</div>`;

        return `
          <div class="wish-card">
            <div class="wish-header">
              <div class="sender-info">
                ${avatarHtml}
                <div>
                  <strong class="sender-name">${w.senderName}</strong>
                  <span class="sender-dept">${w.senderDepartment || "Colleague"}</span>
                </div>
              </div>
              <div class="wish-meta">
                <span class="sticker-badge">${stickerInfo.label}</span>
                <span class="wish-date">${new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            </div>
            <p class="wish-text">“${w.message}”</p>
            ${photoHtml}
            ${reactionsHtml}
          </div>
        `;
      }).join("")
      : `<p class="no-wishes">No celebration greetings recorded yet.</p>`;

    const avatarHeroHtml = selectedCelebrant.photoUrl
      ? `<img src="${selectedCelebrant.photoUrl}" class="avatar-img" alt="${selectedCelebrant.name}" />`
      : `<div class="avatar-fallback">${selectedCelebrant.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,400&family=Inter:wght@400;500;600;700&display=swap');
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 40px 20px;
              background: #f7f6f0;
              color: #0f172a;
              font-family: 'Inter', -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .keepsake-wrapper {
              max-width: 820px;
              margin: 0 auto;
              background: #ffffff;
              border: 4px double #d4af37;
              border-radius: 24px;
              padding: 48px;
              position: relative;
              box-shadow: 0 12px 48px rgba(0,0,0,0.08);
            }
            .gold-corner {
              position: absolute;
              font-size: 20px;
              color: #d4af37;
              line-height: 1;
            }
            .top-left { top: 16px; left: 16px; }
            .top-right { top: 16px; right: 16px; }
            .bottom-left { bottom: 16px; left: 16px; }
            .bottom-right { bottom: 16px; right: 16px; }
            .header { text-align: center; border-bottom: 2px solid #f1e9d2; padding-bottom: 28px; margin-bottom: 28px; }
            .cert-badge {
              display: inline-block;
              padding: 6px 18px;
              border-radius: 9999px;
              background: #fff8e6;
              border: 1px solid #d4af37;
              color: #996515;
              font-family: 'Cinzel', serif;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 18px;
            }
            .avatar-container {
              margin: 0 auto 16px auto;
              position: relative;
              width: 96px;
              height: 96px;
            }
            .avatar-img {
              width: 96px;
              height: 96px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #d4af37;
              box-shadow: 0 4px 16px rgba(212,175,55,0.35);
            }
            .avatar-fallback {
              width: 96px;
              height: 96px;
              border-radius: 50%;
              background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);
              color: #ffffff;
              font-size: 32px;
              font-family: 'Cinzel', serif;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #f3e5ab;
              box-shadow: 0 4px 16px rgba(212,175,55,0.35);
            }
            .cake-emoji-badge {
              position: absolute;
              bottom: -4px;
              right: -4px;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid #d4af37;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            }
            .name {
              margin: 0;
              font-size: 34px;
              font-weight: 900;
              font-family: 'Playfair Display', serif;
              color: #1a202c;
              letter-spacing: -0.5px;
            }
            .dept {
              color: #64748b;
              font-size: 13px;
              font-weight: 600;
              margin-top: 4px;
            }
            .event-date {
              display: inline-block;
              margin-top: 10px;
              font-size: 13px;
              font-weight: 700;
              color: #996515;
              background: #fef9ee;
              padding: 4px 16px;
              border-radius: 6px;
              border: 1px dashed #d4af37;
            }
            .citation {
              margin: 16px auto 0 auto;
              max-width: 600px;
              font-family: 'Playfair Display', serif;
              font-style: italic;
              font-size: 14px;
              color: #475569;
              line-height: 1.6;
            }
            .stats-row {
              display: flex;
              justify-content: center;
              gap: 16px;
              margin-bottom: 28px;
            }
            .stat-pill {
              background: #fbf9f4;
              border: 1px solid #ebd9a9;
              border-radius: 10px;
              padding: 10px 18px;
              text-align: center;
              min-width: 140px;
            }
            .stat-val { font-size: 20px; font-weight: 800; color: #1e293b; }
            .stat-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
            .wishes-heading {
              font-family: 'Cinzel', serif;
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 1px;
              color: #996515;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1px solid #f1e9d2;
              padding-bottom: 8px;
            }
            .wishes-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }
            .wish-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 14px;
              background: #fdfdfd;
              box-shadow: 0 1px 4px rgba(0,0,0,0.03);
              page-break-inside: avoid;
              break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .wish-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
            }
            .sender-info {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .sender-avatar-img {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              object-fit: cover;
              border: 1px solid #cbd5e1;
            }
            .sender-avatar-initial {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #00c5a0;
              color: #ffffff;
              font-size: 11px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sender-name { font-size: 13px; font-weight: 700; color: #0f172a; display: block; }
            .sender-dept { font-size: 10px; color: #64748b; }
            .wish-meta { text-align: right; }
            .wish-date { font-size: 10px; color: #94a3b8; display: block; }
            .sticker-badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 700;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 2px 6px;
              margin-bottom: 2px;
            }
            .wish-text {
              font-size: 12px;
              color: #334155;
              line-height: 1.5;
              margin: 8px 0;
              font-style: italic;
            }
            .wish-photos {
              display: flex;
              gap: 6px;
              margin-top: 6px;
            }
            .wish-photo-thumb {
              width: 44px;
              height: 44px;
              border-radius: 6px;
              object-fit: cover;
              border: 1px solid #cbd5e1;
            }
            .wish-reactions {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px dashed #e2e8f0;
            }
            .reaction-pill {
              display: inline-flex;
              align-items: center;
              gap: 3px;
              background: #f1f5f9;
              padding: 1px 6px;
              border-radius: 9999px;
              font-size: 10px;
              font-weight: 700;
            }
            .footer-seal {
              margin-top: 36px;
              padding-top: 20px;
              border-top: 2px solid #f1e9d2;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #64748b;
            }
            .seal-stamp {
              font-family: 'Cinzel', serif;
              font-weight: 800;
              color: #996515;
              font-size: 12px;
              letter-spacing: 1px;
            }
            .floating-controls {
              position: fixed;
              top: 16px;
              right: 20px;
              z-index: 100;
              display: flex;
              gap: 8px;
              background: rgba(15, 23, 42, 0.92);
              padding: 8px 12px;
              border-radius: 12px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.3);
              backdrop-filter: blur(8px);
            }
            .print-btn {
              background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);
              color: #0b132b;
              border: none;
              border-radius: 8px;
              padding: 8px 18px;
              font-size: 13px;
              font-weight: 800;
              cursor: pointer;
            }
            .close-btn {
              background: #334155;
              color: #ffffff;
              border: none;
              border-radius: 8px;
              padding: 8px 14px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
            }
            .no-wishes {
              grid-column: span 2;
              text-align: center;
              color: #94a3b8;
              font-style: italic;
              padding: 32px;
            }
            @media print {
              body { background: #ffffff !important; padding: 0 !important; }
              .no-print { display: none !important; }
              .keepsake-wrapper { box-shadow: none !important; border: 2px solid #d4af37 !important; padding: 28px !important; }
            }
          </style>
        </head>
        <body>
          <div class="floating-controls no-print">
            <button onclick="window.print()" class="print-btn">🖨️ Print / Save as PDF</button>
            <button onclick="window.close()" class="close-btn">✕ Close</button>
          </div>

          <div class="keepsake-wrapper">
            <div class="gold-corner top-left">⚜</div>
            <div class="gold-corner top-right">⚜</div>
            <div class="gold-corner bottom-left">⚜</div>
            <div class="gold-corner bottom-right">⚜</div>

            <div class="header">
              <div class="cert-badge">★ Commemorative Celebration Keepsake · 2026 ★</div>
              <div class="avatar-container">
                ${avatarHeroHtml}
                <div class="cake-emoji-badge">🎂</div>
              </div>
              <h1 class="name">${selectedCelebrant.name}</h1>
              <div class="dept">Department of ${selectedCelebrant.department} · ${selectedCelebrant.role}</div>
              <div class="event-date">
                🎂 Celebrating on ${MONTH_NAMES[selectedCelebrant.month - 1]} ${selectedCelebrant.day}, 2026 🎉
              </div>
              <p class="citation">
                “Presented with heartfelt appreciation and congratulations by your colleagues at NexAce. This commemorative keepsake preserves the warm wishes, accolades, and shared memories from your team.”
              </p>
            </div>

            <div class="stats-row">
              <div class="stat-pill">
                <div class="stat-val">${celebrantWishes.length}</div>
                <div class="stat-lbl">Wishes Received</div>
              </div>
              <div class="stat-pill">
                <div class="stat-val">${totalReactions}</div>
                <div class="stat-lbl">Reactions Engaged</div>
              </div>
              <div class="stat-pill">
                <div class="stat-val">${totalPhotos}</div>
                <div class="stat-lbl">Attached Memories</div>
              </div>
            </div>

            <div class="wishes-heading">
              <span>Team Greetings & Accolades (${celebrantWishes.length})</span>
            </div>

            <div class="wishes-grid">
              ${wishesHtml}
            </div>

            <div class="footer-seal">
              <div class="seal-stamp">★ NEXACE CRM OFFICIAL CELEBRATION MEMENTO ★</div>
              <div>Issued on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─────────────────────────────────────────────────────────────
  // 9b. WhatsApp Message Customizer Handlers (Zero Popups)
  // ─────────────────────────────────────────────────────────────
  const handleOpenWhatsAppCustomizer = () => {
    if (!selectedCelebrant) return;
    if (!isWhatsAppCustomizerOpen) {
      // Pre-fill with composer text if user already started writing one, or a festive default
      const defaultMsg = composerMessage.trim()
        ? composerMessage.trim()
        : `Happy ${selectedCelebrant.type === "birthday" ? "Birthday" : "Work Anniversary"}, ${selectedCelebrant.name}! 🎉 Wishing you a fantastic celebration and continued success! ✨`;
      setWhatsAppCustomMessage(defaultMsg);
      setWhatsAppCustomPhone(selectedCelebrant.phone || "");
      if (composerAttachments.length > 0 && whatsAppAttachments.length === 0) {
        setWhatsAppAttachments([...composerAttachments]);
      }
    }
    setIsWhatsAppCustomizerOpen((prev) => !prev);
  };

  const handleInsertWhatsAppEmoji = (emoji: string) => {
    const textarea = whatsAppTextareaRef.current;
    if (!textarea) {
      setWhatsAppCustomMessage((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? whatsAppCustomMessage.length;
    const end = textarea.selectionEnd ?? whatsAppCustomMessage.length;
    const nextMsg =
      whatsAppCustomMessage.slice(0, start) + emoji + whatsAppCustomMessage.slice(end);
    setWhatsAppCustomMessage(nextMsg);
    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleWhatsAppFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (whatsAppAttachments.length + files.length > 4) {
      onToast("Maximum 4 photo attachments allowed", "error");
      return;
    }

    setIsWhatsAppUploading(true);
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
          setWhatsAppAttachments((prev) => [
            ...prev,
            {
              url: data.url,
              name: file.name,
              type: file.type.startsWith("image/") ? "image" : "file",
              size: file.size,
            },
          ]);
          onToast(`Attached ${file.name}`, "success");
        } else {
          onToast(`Failed to upload ${file.name}`, "error");
        }
      }
    } catch (err) {
      console.error("WhatsApp file upload error:", err);
      onToast("Failed to upload photo", "error");
    } finally {
      setIsWhatsAppUploading(false);
      if (whatsAppFileInputRef.current) whatsAppFileInputRef.current.value = "";
    }
  };

  const handleRemoveWhatsAppAttachment = (idx: number) => {
    setWhatsAppAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyPhotoToClipboard = async (att: WishAttachment) => {
    try {
      const res = await fetch(att.url);
      const blob = await res.blob();

      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) {
          const fullUrl = `${window.location.origin}${att.url}`;
          await navigator.clipboard.writeText(fullUrl);
          onToast("Photo link copied! Paste (Ctrl+V) in WhatsApp", "success");
          return;
        }
        try {
          if (typeof window !== "undefined" && (window as any).ClipboardItem && navigator.clipboard?.write) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ "image/png": pngBlob }),
            ]);
            onToast("Photo copied! You can now Ctrl+V (Paste) directly in WhatsApp! 📋", "success");
          } else {
            const fullUrl = `${window.location.origin}${att.url}`;
            await navigator.clipboard.writeText(fullUrl);
            onToast("Photo link copied! Paste (Ctrl+V) in WhatsApp", "success");
          }
        } catch {
          const fullUrl = `${window.location.origin}${att.url}`;
          await navigator.clipboard.writeText(fullUrl);
          onToast("Photo link copied! Paste (Ctrl+V) in WhatsApp", "success");
        }
      }, "image/png");
    } catch (err) {
      console.warn("Could not copy photo blob:", err);
      try {
        const fullUrl = `${window.location.origin}${att.url}`;
        await navigator.clipboard.writeText(fullUrl);
        onToast("Photo link copied to clipboard! 📋", "success");
      } catch {
        onToast("Failed to copy photo", "error");
      }
    }
  };

  const handleSendWhatsApp = (mode: "auto" | "web" | "app" = "auto") => {
    if (!selectedCelebrant) return;
    const phone = (whatsAppCustomPhone || selectedCelebrant.phone || "").replace(/[^\d]/g, "");
    if (!phone) {
      onToast("Please enter a valid recipient phone number with country code", "error");
      return;
    }
    const text = whatsAppCustomMessage.trim();
    if (!text && whatsAppAttachments.length === 0) {
      onToast("Please write a message or add a photo to send", "error");
      return;
    }

    let fullText = text;
    if (whatsAppAttachments.length > 0) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const links = whatsAppAttachments.map((att) => `${origin}${att.url}`).join("\n");
      fullText = fullText
        ? `${fullText}\n\n📸 Photo${whatsAppAttachments.length > 1 ? "s" : ""}:\n${links}`
        : `📸 Photo${whatsAppAttachments.length > 1 ? "s" : ""}:\n${links}`;
    }

    // Always copy pristine message with all Unicode emojis to clipboard as an instant safety net
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(fullText);
      }
    } catch {
      // ignore
    }

    const encoded = encodeURIComponent(fullText);

    // Detect mobile OS (iOS / Android) vs Desktop (Windows / Mac)
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (mode === "app" || (mode === "auto" && isMobile)) {
      // Direct native app scheme: bypasses wa.me redirect, preserving all 4-byte UTF-8 emojis on iOS & Android
      const appUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;
      window.location.href = appUrl;
      onToast("Opening WhatsApp App with emojis preserved! ✨", "success");
    } else {
      // Desktop (Windows & Mac) WhatsApp Web:
      // Direct to web.whatsapp.com without wa.me 302 redirect (wa.me corrupts emojis to %EF%BF%BD)
      const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
      const win = window.open(webUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        window.location.href = webUrl;
      }
      onToast("Opening WhatsApp Web with emojis preserved! ✨", "success");
    }

    setIsWhatsAppCustomizerOpen(false);
  };

  const handleNativeShareWhatsApp = async () => {
    if (!selectedCelebrant) return;
    const text = whatsAppCustomMessage.trim();
    if (!text && whatsAppAttachments.length === 0) {
      onToast("Please write a message or add a photo to share", "error");
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        const shareData: ShareData = {
          title: `Celebration wish for ${selectedCelebrant.name}`,
          text: text || `Celebration wish for ${selectedCelebrant.name}! 🎉`,
        };

        if (whatsAppAttachments.length > 0 && navigator.canShare) {
          const filePromises = whatsAppAttachments.map(async (att, idx) => {
            const res = await fetch(att.url);
            const blob = await res.blob();
            const ext = att.name.split(".").pop() || "jpg";
            return new File([blob], att.name || `photo_${idx + 1}.${ext}`, {
              type: blob.type || "image/jpeg",
            });
          });
          const files = await Promise.all(filePromises);
          if (navigator.canShare({ files })) {
            shareData.files = files;
          }
        }

        await navigator.share(shareData);
        onToast("Shared successfully! 🎉", "success");
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.warn("Native share error, falling back to standard link:", err);
    }

    handleSendWhatsApp();
  };

  const handleCopyWhatsAppText = async () => {
    if (!whatsAppCustomMessage.trim() && whatsAppAttachments.length === 0) return;
    let fullText = whatsAppCustomMessage.trim();
    if (whatsAppAttachments.length > 0) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const links = whatsAppAttachments.map((att) => `${origin}${att.url}`).join("\n");
      fullText = fullText
        ? `${fullText}\n\n📸 Photo${whatsAppAttachments.length > 1 ? "s" : ""}:\n${links}`
        : `📸 Photo${whatsAppAttachments.length > 1 ? "s" : ""}:\n${links}`;
    }
    try {
      await navigator.clipboard.writeText(fullText);
      onToast("WhatsApp message & photo links copied! 📋", "success");
    } catch {
      onToast("Failed to copy message", "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 10. One-Click Thank All (For Celebrant)
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
        // Trigger celebratory confetti burst!
        setConfettiTrigger(Date.now());
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

  const currentUserId = currentUser?._id || (currentUser as any)?.userId || (currentUser as any)?.id;
  const isWishingSelf = Boolean(
    currentUserId &&
    selectedCelebrant &&
    (String(currentUserId) === String(selectedCelebrant.userId) ||
     (currentUser?.email && (selectedCelebrant as any)?.email && currentUser.email === (selectedCelebrant as any)?.email))
  );
  const isCelebrantToday = selectedCelebrant?.isToday;
  const isBirthdayUser = Boolean(
    isWishingSelf &&
    selectedCelebrant?.type === "birthday"
  );

  return (
    <div className="space-y-6 relative overflow-hidden">
      {/* Full-Screen Confetti Particle Explosion Canvas */}
      <CelebrationsConfettiCanvas triggerKey={confettiTrigger} duration={3800} mode="cannon" />

      {/* ── Top Header & Stats Strip ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border">
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

        {/* Action & Navigation Controls Toolbar */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Sub-view switcher for elevated roles */}
          {canModerate && (
            <div className="inline-flex items-center p-1 bg-secondary/80 dark:bg-muted/70 rounded-xl border border-border shadow-2xs shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveSubView("celebrations")}
                className={cn(
                  "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]",
                  activeSubView === "celebrations"
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-cake-candles text-xs text-amber-500" />
                <span>Celebrants & Wall</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView("moderation")}
                className={cn(
                  "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[36px]",
                  activeSubView === "moderation"
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-shield-halved text-xs text-rose-500" />
                <span>Wishes Moderation</span>
                {allWishesFeed.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-500 font-extrabold border border-rose-500/20">
                    {allWishesFeed.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Confetti Explosion Celebrate Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfettiTrigger(Date.now())}
              className="flex-1 sm:flex-initial min-h-[38px] px-3.5 rounded-xl text-xs font-bold gap-2 text-amber-500 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 shadow-2xs hover:scale-102 active:scale-95 transition-all cursor-pointer"
              title="Celebrate with full-screen confetti explosion"
            >
              <i className="fa-solid fa-champagne-glasses text-amber-500 text-xs" />
              <span>Celebrate</span>
            </Button>

            {/* Broadcast Today's Cards for Admin/OPS/HR */}
            {canModerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="flex-1 sm:flex-initial min-h-[38px] px-3.5 rounded-xl text-xs font-bold gap-2 text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 shadow-2xs cursor-pointer hover:scale-102 active:scale-95 transition-all"
                title="Broadcast today's celebratory cards to all company channels"
              >
                <i className={cn("fa-solid text-xs", isBroadcasting ? "fa-circle-notch fa-spin" : "fa-bullhorn")} />
                <span className="hidden sm:inline">{isBroadcasting ? "Broadcasting..." : "Broadcast Today's Cards"}</span>
                <span className="inline sm:hidden">{isBroadcasting ? "Broadcasting..." : "Broadcast"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Today's Celebrations */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-amber-500/50 transition-all duration-300 relative overflow-hidden group space-y-1">
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5">
              <span>Today's Celebrations</span>
              {stats.todayTotal > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-cake-candles" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight flex items-center gap-2">
            <span>{stats.todayTotal}</span>
            {stats.todayTotal > 0 && <span className="text-base animate-bounce">🎉</span>}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            {stats.todayTotal > 0 ? "Active celebrants today" : "No celebrations today"}
          </p>
        </div>

        {/* 2. Upcoming (14 Days) */}
        <div className="p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-purple-500/50 transition-all duration-300 relative overflow-hidden group space-y-1">
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Upcoming (14 Days)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-calendar-check" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-500 tracking-tight">
            {stats.upcomingTotal}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Birthdays & anniversaries ahead
          </p>
        </div>

        {/* 3. In Selected Month */}
        <div className="p-4 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-sky-500/50 transition-all duration-300 relative overflow-hidden group space-y-1">
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-sky-500/10 blur-xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>In {MONTH_NAMES[selectedMonth - 1]}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 border border-sky-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-calendar-days" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-500 tracking-tight">
            {currentMonthCelebrants.length}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Total roster this month</p>
        </div>

        {/* 4. Wishes Exchanged */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden group space-y-1">
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Wishes Exchanged</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-comments" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
            {stats.totalWishes || celebrantWishes.length}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Peer greetings recorded</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 1: CELEBRANTS & IN-PAGE WISH WALL
      ───────────────────────────────────────────────────────────── */}
      {activeSubView === "celebrations" && (
        <div className="space-y-6">
          {/* Month Strip Selector: Jan to Dec with Theme Mint-Teal Pills */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
            <div className="text-xs font-bold text-muted-foreground flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-foreground font-extrabold">
                <i className="fa-solid fa-filter text-primary text-xs" />
                <span>Filter Celebrations by Month:</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold shadow-2xs">
                <i className="fa-solid fa-calendar-star text-primary text-xs" />
                <span>Viewing {MONTH_NAMES[selectedMonth - 1]} ({currentMonthCelebrants.length} Events)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth touch-pan-x">
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
                      "flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-[38px] border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-black scale-102"
                        : isRealCurrentMonth
                        ? "bg-primary/10 text-primary border-primary/40 font-bold hover:bg-primary/20"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/70"
                    )}
                  >
                    <span>{shortName}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 transition-all",
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-primary/15 text-primary border border-primary/20"
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {isRealCurrentMonth && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-ping shrink-0" title="Current Month" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Viewport Segmented Switcher (Visible on screens < lg) */}
          <div className="lg:hidden flex items-center p-1 bg-muted/60 rounded-xl border border-border/60 gap-1 w-full">
            <button
              type="button"
              onClick={() => setMobileActiveView("roster")}
              className={cn(
                "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer",
                mobileActiveView === "roster"
                  ? "bg-card text-foreground shadow-xs border border-border font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-users text-primary text-xs" />
              <span>Celebrants ({currentMonthCelebrants.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileActiveView("detail")}
              className={cn(
                "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer",
                mobileActiveView === "detail"
                  ? "bg-card text-foreground shadow-xs border border-border font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-comments text-primary text-xs" />
              <span className="truncate">Wish Wall {selectedCelebrant ? `· ${selectedCelebrant.name.split(" ")[0]}` : ""}</span>
            </button>
          </div>

          {/* Dual-Panel View: Left = Celebrants Roster, Right = Wish Wall & Composer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Left Column: Celebrant Roster (5 Cols on Desktop, Full Width on Mobile) ── */}
            <div className={cn("lg:col-span-5 space-y-4", mobileActiveView !== "roster" && "hidden lg:block")}>
              <Card className="p-3.5 sm:p-4 border-border/80 shadow-xs space-y-3 bg-card">
                {/* 2-Tier Roster Search & Adaptive Category Segment */}
                <div className="space-y-2.5">
                  {/* Tier 1: Search Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search celebrant or dept..."
                        className="pl-8 pr-8 text-xs h-9 min-h-[38px]"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer p-1"
                        >
                          <i className="fa-solid fa-circle-xmark" />
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground px-2 py-1 rounded-lg bg-muted border border-border/50 shrink-0">
                      {filteredCelebrants.length} found
                    </span>
                  </div>

                  {/* Tier 2: Adaptive Category Segment Filter (2x2 on mobile, 4x1 on tablet/desktop) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-muted/60 rounded-xl border border-border/50 gap-1 w-full">
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("All"); setOnlyNeedsWish(false); }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[36px]",
                        typeFilter === "All" && !onlyNeedsWish
                          ? "bg-card text-foreground shadow-xs border border-border font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>All</span>
                      <span className="text-[10px] opacity-75">({currentMonthCelebrants.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("birthday"); setOnlyNeedsWish(false); }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[36px]",
                        typeFilter === "birthday" && !onlyNeedsWish
                          ? "bg-card text-amber-500 shadow-xs border border-border font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <i className="fa-solid fa-cake-candles text-[10px] text-amber-500" />
                      <span className="truncate">Birthdays</span>
                      <span className="text-[10px] opacity-75">({bdayCountInMonth})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTypeFilter("anniversary"); setOnlyNeedsWish(false); }}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[36px]",
                        typeFilter === "anniversary" && !onlyNeedsWish
                          ? "bg-card text-purple-500 shadow-xs border border-border font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <i className="fa-solid fa-award text-[10px] text-purple-500" />
                      <span className="truncate">Anniv</span>
                      <span className="text-[10px] opacity-75">({annivCountInMonth})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlyNeedsWish((prev) => !prev)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[36px] relative",
                        onlyNeedsWish
                          ? "bg-rose-500 text-white shadow-xs font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Filter celebrants needing a wish"
                    >
                      <i className="fa-solid fa-gift text-[10px]" />
                      <span className="truncate">Needs Wish</span>
                      {unwishedTodayCount > 0 && (
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          onlyNeedsWish ? "bg-white animate-pulse" : "bg-rose-500 animate-ping"
                        )} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Celebrants List */}
                <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredCelebrants.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl border-border/80 space-y-2 bg-muted/20">
                      <i className="fa-solid fa-calendar-xmark text-2xl text-muted-foreground/60" />
                      <p className="text-xs font-semibold text-muted-foreground">
                        {onlyNeedsWish
                          ? "All celebrants in this view have already received wishes! 🎉"
                          : `No celebrations found for ${MONTH_NAMES[selectedMonth - 1]}.`}
                      </p>
                    </div>
                  ) : (
                    filteredCelebrants.map((celebrant) => {
                      const isSelected = selectedCelebrant?.userId === celebrant.userId;
                      const isBirthday = celebrant.type === "birthday";
                      const needsWish = celebrant.isToday && (!celebrant.wishesCount || celebrant.wishesCount === 0);

                      return (
                        <div
                          key={`${celebrant.userId}_${celebrant.type}_${celebrant.day}`}
                          onClick={() => {
                            setSelectedCelebrant(celebrant);
                            setMobileActiveView("detail");
                          }}
                          className={cn(
                            "p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 shadow-2xs group min-h-[58px]",
                            isSelected
                              ? "bg-primary/10 border-l-4 border-l-primary border-primary/50 shadow-xs ring-1 ring-primary/30"
                              : celebrant.isToday
                              ? "bg-primary/[0.03] border-primary/30 hover:border-primary/50 hover:bg-primary/[0.07]"
                              : "bg-card hover:bg-muted/60 border-border/70"
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
                                  className={cn(
                                    "w-10 h-10 rounded-full object-cover border border-border shadow-xs",
                                    celebrant.isToday && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background animate-pulse"
                                  )}
                                />
                              ) : (
                                <div className={cn(
                                  "w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border shadow-xs",
                                  celebrant.isToday
                                    ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/60 ring-offset-2 ring-offset-background animate-pulse"
                                    : "bg-primary/20 text-primary border-primary/30"
                                )}>
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                                  {celebrant.name}
                                </h4>
                                {celebrant.isToday && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-primary text-primary-foreground uppercase tracking-wider shadow-2xs animate-pulse">
                                    TODAY! 🥳
                                  </span>
                                )}
                                {needsWish && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1">
                                    <i className="fa-solid fa-sparkles text-[8px]" />
                                    Be first!
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {celebrant.department} · {celebrant.role}
                              </p>
                              <div className="text-[10px] font-semibold text-primary mt-0.5 flex items-center gap-1">
                                <i className="fa-regular fa-calendar text-[9px]" />
                                <span>{MONTH_NAMES[selectedMonth - 1]} {celebrant.day}</span>
                                {celebrant.label && celebrant.type === "anniversary" && (
                                  <span className="text-purple-500">· {celebrant.label}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span
                              className={cn(
                                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                                celebrant.isToday
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : isBirthday
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  : "bg-purple-500/10 text-purple-500 border-purple-500/30"
                              )}
                            >
                              Day {celebrant.day}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs",
                                  celebrant.wishesCount && celebrant.wishesCount > 0
                                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30 font-black"
                                    : "bg-muted text-muted-foreground border-border/60"
                                )}
                                title={`${celebrant.wishesCount || 0} wishes received this year`}
                              >
                                <i className="fa-solid fa-heart text-[8px] text-rose-500" />
                                <span>{celebrant.wishesCount || 0}</span>
                              </span>
                              <i className="fa-solid fa-chevron-right text-[10px] text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* ── Right Column: Wish Wall & In-Page Composer (7 Cols on Desktop, Full Width on Mobile) ── */}
            <div className={cn("lg:col-span-7 space-y-5 relative", mobileActiveView !== "detail" && "hidden lg:block")}>
              {/* Confetti Explosion Canvas */}
              <CelebrationsConfettiCanvas triggerKey={confettiTrigger} />

              {selectedCelebrant ? (
                <>
                  {/* Mobile Back to Roster Navigator */}
                  <div className="flex items-center justify-between lg:hidden pb-1">
                    <button
                      type="button"
                      onClick={() => setMobileActiveView("roster")}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs min-h-[38px] cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-left text-primary" />
                      <span>Back to Celebrants Roster</span>
                    </button>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {MONTH_NAMES[selectedMonth - 1]} Celebrations
                    </span>
                  </div>

                  {/* Celebrant Profile Banner */}
                  <Card className="p-4 sm:p-6 border border-border/80 shadow-xs rounded-2xl overflow-hidden relative bg-gradient-to-br from-card via-card to-primary/[0.04] backdrop-blur-xs">
                    {/* Atmospheric Glow Orbs */}
                    <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-gradient-to-tr from-primary/5 to-transparent blur-2xl pointer-events-none" />

                    <div className="space-y-4 relative z-10">
                      {/* Tier 1: Full-Width Celebrant Identity (Zero Squeezing / Never Truncated) */}
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                        <div className="relative shrink-0">
                          {selectedCelebrant.photoUrl ? (
                            <Image
                              src={selectedCelebrant.photoUrl}
                              alt={selectedCelebrant.name}
                              width={64}
                              height={64}
                              className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-primary/40 shadow-md",
                                selectedCelebrant.isToday && "ring-4 ring-primary/40 ring-offset-2 ring-offset-background animate-pulse"
                              )}
                            />
                          ) : (
                            <div className={cn(
                              "w-14 h-14 sm:w-16 sm:h-16 rounded-full font-black text-base sm:text-lg flex items-center justify-center border-2 shadow-md",
                              selectedCelebrant.isToday
                                ? "bg-gradient-to-br from-primary via-emerald-500 to-teal-600 text-primary-foreground border-primary/50 ring-4 ring-primary/40 ring-offset-2 ring-offset-background animate-pulse"
                                : "bg-primary/20 text-primary border-primary/40"
                            )}>
                              {selectedCelebrant.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-card bg-primary text-primary-foreground">
                            {selectedCelebrant.type === "birthday" ? "🎂" : "🏆"}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-xl font-black text-foreground tracking-tight">
                              {selectedCelebrant.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-black gap-1.5 px-2.5 py-0.5 rounded-full shadow-2xs shrink-0",
                                selectedCelebrant.type === "birthday"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                  : "bg-purple-500/10 text-purple-500 border-purple-500/30"
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
                            {selectedCelebrant.isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground uppercase tracking-wider shadow-2xs animate-pulse shrink-0">
                                TODAY! 🥳
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedCelebrant.department} · {selectedCelebrant.role}
                          </p>
                          <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <i className="fa-regular fa-calendar-check text-xs" />
                            <span>
                              {MONTH_NAMES[selectedCelebrant.month - 1]} {selectedCelebrant.day}
                              {selectedCelebrant.isToday ? " · Celebrating Today! 🎉" : ""}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Personal celebration hero note when viewing self */}
                      {isWishingSelf && (
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 flex items-center gap-2.5 text-xs text-primary font-semibold">
                          <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-champagne-glasses text-xs" />
                          </div>
                          <p className="flex-1 text-foreground/90 leading-tight">
                            <strong className="text-primary font-black">Happy {selectedCelebrant.type === "birthday" ? "Birthday" : "Anniversary"}, {selectedCelebrant.name.split(" ")[0]}! 🎉</strong> This is your personal celebration wall featuring wishes and reactions from your team.
                          </p>
                        </div>
                      )}

                      {/* Tier 2: Dedicated Action Toolbar (Full Width - Always Ample Room!) */}
                      <div className="pt-2.5 border-t border-border/60 grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfettiTrigger(Date.now())}
                          className="w-full sm:w-auto justify-center text-xs font-bold gap-1.5 min-h-[38px] sm:min-h-[40px] border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          title="Blast full-screen celebratory confetti"
                        >
                          <i className="fa-solid fa-wand-magic-sparkles text-xs text-primary" />
                          <span>Celebrate</span>
                        </Button>

                        {isWishingSelf && isCelebrantToday && (
                          <Button
                            size="sm"
                            onClick={handleThankAll}
                            disabled={isThankingAll || hasThankedAll}
                            className="w-full sm:w-auto justify-center text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[38px] sm:min-h-[40px] shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <i className="fa-solid fa-heart" />
                            <span>{hasThankedAll ? "Thanked All ❤️" : isThankingAll ? "Sending..." : "Thank Everyone"}</span>
                          </Button>
                        )}

                        {/* Keepsake Card Trigger Button - Strictly available for the Birthday user */}
                        {isBirthdayUser && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsKeepsakeModalOpen(true)}
                            title="Preview and print your commemorative digital keepsake card"
                            className="w-full sm:w-auto justify-center text-xs font-bold gap-1.5 min-h-[38px] sm:min-h-[40px] border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            <i className="fa-solid fa-gift text-amber-500 text-xs" />
                            <span>Keepsake Card</span>
                          </Button>
                        )}

                        {/* WhatsApp Customizer Trigger Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenWhatsAppCustomizer}
                          className={cn(
                            "w-full sm:w-auto justify-center text-xs font-bold gap-1.5 min-h-[38px] sm:min-h-[40px] transition-all cursor-pointer border",
                            isWhatsAppCustomizerOpen
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-xs"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          )}
                          title="Customize & send WhatsApp message"
                        >
                          <i className="fa-brands fa-whatsapp text-sm text-emerald-600 dark:text-emerald-400" />
                          <span>WhatsApp</span>
                          <i
                            className={cn(
                              "fa-solid text-[9px] transition-transform",
                              isWhatsAppCustomizerOpen ? "fa-chevron-up" : "fa-chevron-down"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* ── Inline WhatsApp Message Customizer Drawer (Zero Popups) ── */}
                    {isWhatsAppCustomizerOpen && (
                      <div className="mt-4 pt-4 border-t border-border/80 space-y-3 animate-in fade-in duration-200">
                        {/* Hidden file input for WhatsApp photo attachments */}
                        <input
                          type="file"
                          ref={whatsAppFileInputRef}
                          accept="image/*"
                          multiple
                          onChange={handleWhatsAppFileUpload}
                          className="hidden"
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                              <i className="fa-brands fa-whatsapp" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              Customize WhatsApp Message for {selectedCelebrant.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsWhatsAppCustomizerOpen(false)}
                            className="text-xs text-muted-foreground hover:text-foreground self-end sm:self-auto cursor-pointer p-1"
                            title="Close WhatsApp customizer"
                          >
                            <i className="fa-solid fa-xmark text-sm" />
                          </button>
                        </div>

                        {/* Quick Message Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                            Presets:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setWhatsAppCustomMessage(
                                `Happy ${selectedCelebrant.type === "birthday" ? "Birthday" : "Work Anniversary"}, ${selectedCelebrant.name.split(" ")[0]}! 🎂 Wishing you tons of happiness, good health, and immense success! Have a wonderful day! ✨`
                              )
                            }
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted hover:bg-emerald-500/15 hover:text-emerald-600 border border-border transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            🎂 Warm Greeting
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setWhatsAppCustomMessage(
                                `Hey ${selectedCelebrant.name.split(" ")[0]}! 🎈🍕 Happy ${selectedCelebrant.type === "birthday" ? "Birthday" : "Anniversary"} to our resident rockstar in ${selectedCelebrant.department}! Hope you have an awesome day with zero work stress! 🥳`
                              )
                            }
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted hover:bg-emerald-500/15 hover:text-emerald-600 border border-border transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            🎈 Fun & Cheerful
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setWhatsAppCustomMessage(
                                `Happy ${selectedCelebrant.type === "birthday" ? "Birthday" : "Work Anniversary"}, ${selectedCelebrant.name}! 🌟 Thank you for your leadership, guidance, and continuous dedication to our team! 🏆 Cheers!`
                              )
                            }
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted hover:bg-emerald-500/15 hover:text-emerald-600 border border-border transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            🌟 Leadership
                          </button>
                          {composerMessage.trim() && (
                            <button
                              type="button"
                              onClick={() => setWhatsAppCustomMessage(composerMessage.trim())}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <i className="fa-solid fa-copy mr-1" /> Use Composer Text
                            </button>
                          )}
                        </div>

                        {/* WhatsApp-Supported Emojis Strip (1-tap insert at cursor) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <i className="fa-solid fa-face-smile" /> WhatsApp Emojis (Click to insert):
                            </span>
                            <span className="text-[10px] lowercase font-normal opacity-70">Native WhatsApp Icons</span>
                          </div>
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1.5 rounded-xl bg-muted/40 border border-border/60">
                            {WHATSAPP_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleInsertWhatsAppEmoji(emoji)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm sm:text-base hover:bg-emerald-500/20 hover:scale-115 active:scale-95 transition-all cursor-pointer shrink-0 border border-transparent hover:border-emerald-500/30"
                                title={`Insert ${emoji} into WhatsApp message`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Message Textarea */}
                        <textarea
                          ref={whatsAppTextareaRef}
                          value={whatsAppCustomMessage}
                          onChange={(e) => setWhatsAppCustomMessage(e.target.value)}
                          rows={3}
                          placeholder={`Write your custom WhatsApp greeting for ${selectedCelebrant.name}...`}
                          className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none transition-all placeholder:text-muted-foreground/60"
                        />

                        {/* WhatsApp Attachments / Photo Sharing Section */}
                        <div className="space-y-2 pt-1 border-t border-border/60">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <i className="fa-solid fa-paperclip text-xs text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[11px] font-bold text-foreground">
                                Photos & Attachments ({whatsAppAttachments.length}/4)
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                · Included as preview links & copyable for WhatsApp Web
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isWhatsAppUploading || whatsAppAttachments.length >= 4}
                                onClick={() => whatsAppFileInputRef.current?.click()}
                                className="text-xs font-semibold gap-1.5 h-7 min-h-[30px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                {isWhatsAppUploading ? (
                                  <i className="fa-solid fa-spinner fa-spin" />
                                ) : (
                                  <i className="fa-solid fa-camera" />
                                )}
                                <span>{isWhatsAppUploading ? "Uploading..." : "Add Photo"}</span>
                              </Button>

                              {composerAttachments.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newAtts = composerAttachments.filter(
                                      (ca) => !whatsAppAttachments.some((wa) => wa.url === ca.url)
                                    );
                                    if (newAtts.length === 0) {
                                      onToast("All composer photos are already attached", "error");
                                      return;
                                    }
                                    if (whatsAppAttachments.length + newAtts.length > 4) {
                                      onToast("Maximum 4 attachments allowed", "error");
                                      return;
                                    }
                                    setWhatsAppAttachments((prev) => [...prev, ...newAtts]);
                                    onToast(`Imported ${newAtts.length} photo(s) from wish composer! 📸`, "success");
                                  }}
                                  className="text-[11px] font-semibold gap-1 h-7 min-h-[30px] text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                                  title="Import photos already attached in wish composer"
                                >
                                  <i className="fa-solid fa-file-import" />
                                  <span>Import from Wish</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          {whatsAppAttachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                              {whatsAppAttachments.map((att, idx) => (
                                <div
                                  key={att.url + idx}
                                  className="relative group rounded-xl border border-border bg-card p-2 flex items-center gap-2.5 overflow-hidden shadow-2xs"
                                >
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-11 h-11 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity shrink-0 border border-border/60"
                                    onClick={() => setPreviewImage(att.url)}
                                    title="Click to view full photo"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium text-foreground truncate" title={att.name}>
                                      {att.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPhotoToClipboard(att)}
                                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                        title="Copy image to clipboard so you can press Ctrl+V directly in WhatsApp Web"
                                      >
                                        <i className="fa-solid fa-copy text-[9px]" /> Copy Photo
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWhatsAppAttachment(idx)}
                                    className="w-6 h-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-[10px] transition-colors cursor-pointer shrink-0 ml-auto"
                                    title="Remove photo"
                                  >
                                    <i className="fa-solid fa-xmark" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Phone Number Input & Action Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                          <div className="flex items-center gap-2 flex-1 max-w-sm">
                            <span className="text-[11px] font-bold text-muted-foreground shrink-0">Phone:</span>
                            <div className="relative flex-1">
                              <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" />
                              <Input
                                value={whatsAppCustomPhone}
                                onChange={(e) => setWhatsAppCustomPhone(e.target.value)}
                                placeholder="e.g. +1 555-123-4567 or +91 9876543210"
                                className="pl-7 text-xs h-8 min-h-[34px]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 justify-end w-full sm:w-auto">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyWhatsAppText}
                              className="w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 min-h-[38px] cursor-pointer"
                              title="Copy message and photo links with 100% intact emojis to clipboard"
                            >
                              <i className="fa-solid fa-copy" />
                              <span>Copy</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleNativeShareWhatsApp}
                              className="w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 min-h-[38px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              title="Share with photos directly via device share sheet"
                            >
                              <i className="fa-solid fa-share-nodes" />
                              <span>Share</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendWhatsApp("app")}
                              className="w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 min-h-[38px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              title="Open in WhatsApp Desktop (Windows/Mac) or Mobile App directly"
                            >
                              <i className="fa-brands fa-whatsapp text-sm" />
                              <span>Open App</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSendWhatsApp("web")}
                              className="w-full sm:w-auto justify-center text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[38px] shadow-sm cursor-pointer"
                              title="Open directly in WhatsApp Web with zero emoji corruption"
                            >
                              <i className="fa-brands fa-whatsapp text-sm" />
                              <span>WhatsApp Web</span>
                              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                            </Button>
                          </div>
                        </div>

                        {/* Emoji & Encoding Safety Assurance */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                            <span>100% Emoji Support: Direct UTF-8 route preserves emojis on Mac, Windows, iOS & Android.</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* ── In-Page Wish Composer (If not viewing self) ── */}
                  {!isWishingSelf && (
                    <Card className="p-4 border-border shadow-xs space-y-3 bg-card">
                      <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-feather-pointed text-primary" />
                          Send Wish to {selectedCelebrant.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAiDrafterOpen((prev) => !prev)}
                            className={cn(
                              "text-xs font-bold gap-1.5 min-h-[34px] transition-all cursor-pointer",
                              isAiDrafterOpen
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 shadow-xs"
                                : "text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                            )}
                          >
                            <i className="fa-solid fa-wand-magic-sparkles text-purple-500" />
                            <span>AI Wish Drafter</span>
                            <i className={cn("fa-solid text-[9px] transition-transform", isAiDrafterOpen ? "fa-chevron-up" : "fa-chevron-down")} />
                          </Button>
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {composerMessage.length}/600 chars
                          </span>
                        </div>
                      </div>

                      {/* AI Drafter Drawer (Zero Popups) */}
                      {isAiDrafterOpen && (
                        <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <i className="fa-solid fa-sparkles text-[10px]" />
                              Choose an AI Tone for {selectedCelebrant.name}:
                            </span>
                            <span className="text-[10px] text-muted-foreground">Auto-customizes role & milestones</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {AI_TONE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectAiTone(preset)}
                                className="p-2.5 rounded-lg border border-purple-500/20 bg-card hover:bg-purple-500/10 hover:border-purple-500/40 text-left transition-all cursor-pointer group space-y-1 shadow-2xs"
                              >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                  <i className={cn("fa-solid text-purple-500 text-[11px]", preset.icon)} />
                                  <span className="truncate">{preset.label}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

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
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <span className="text-[11px] font-bold text-muted-foreground shrink-0">Badge:</span>
                          {Object.entries(STICKER_CONFIG).map(([key, config]) => {
                            const isSelected = composerSticker === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setComposerSticker(key as any)}
                                title={config.label}
                                className={cn(
                                  "w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer border shrink-0",
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
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
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
                            className="w-full sm:w-auto justify-center text-xs font-semibold gap-1.5 min-h-[38px] sm:min-h-[40px] cursor-pointer"
                          >
                            <i className={cn("fa-solid", isUploading ? "fa-spinner fa-spin" : "fa-camera")} />
                            <span>Photo ({composerAttachments.length}/4)</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmitWish}
                            disabled={isSubmittingWish || !composerMessage.trim()}
                            className="w-full sm:w-auto justify-center text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-h-[38px] sm:min-h-[40px] shadow-sm cursor-pointer"
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
                  )}

                  {/* ── Wish Wall Feed ── */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs shadow-2xs">
                          <i className="fa-solid fa-comments" />
                        </div>
                        <span>Celebration Wall</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/15 text-primary border border-primary/20 shadow-2xs">
                          {celebrantWishes.length}
                        </span>
                      </h4>
                      {wishesLoading && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                          <i className="fa-solid fa-spinner fa-spin text-primary" /> Loading wishes...
                        </span>
                      )}
                    </div>

                    {wishesLoading ? (
                      <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                        <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
                        <p>Loading celebration wishes...</p>
                      </div>
                    ) : celebrantWishes.length === 0 ? (
                      <div className="p-10 text-center border border-dashed rounded-2xl border-border/80 space-y-2.5 bg-card/60">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-lg shadow-2xs">
                          <i className="fa-solid fa-envelope-open-text" />
                        </div>
                        <h5 className="text-xs font-bold text-foreground">No wishes posted yet</h5>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                          Be the first to post a cheerful celebration message for {selectedCelebrant.name}!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {celebrantWishes.map((wish) => {
                          const isMine = Boolean(currentUserId && wish.senderId === currentUserId);
                          const isRecipient = Boolean(currentUserId && wish.recipientId === currentUserId);
                          const canDeleteThisWish = isMine || isRecipient || canModerate;
                          const stickerConfig = STICKER_CONFIG[wish.sticker] || STICKER_CONFIG.cake;

                          return (
                            <Card
                              key={wish._id}
                              className="p-4 sm:p-5 rounded-2xl border border-border/80 shadow-2xs space-y-3.5 hover:border-primary/40 hover:shadow-md transition-all duration-200 bg-card group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                {/* Sender Avatar & Details */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {wish.senderPhotoUrl ? (
                                    <Image
                                      src={wish.senderPhotoUrl}
                                      alt={wish.senderName}
                                      width={40}
                                      height={40}
                                      className="w-10 h-10 rounded-full object-cover border border-border shrink-0 shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/20 shrink-0 shadow-2xs">
                                      {wish.senderName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join("")
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-extrabold text-foreground truncate">
                                        {wish.senderName}
                                      </span>
                                      {isMine && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/15 text-primary font-bold shadow-2xs">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                      {wish.senderDepartment || "Colleague"} · {new Date(wish.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                {/* Sticker Badge & Inline Delete Button */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex items-center gap-1.5 shadow-2xs",
                                      stickerConfig.color
                                    )}
                                  >
                                    <i className={cn("fa-solid text-xs", stickerConfig.icon)} />
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
                                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold min-h-[30px] cursor-pointer shadow-xs"
                                        >
                                          {deletingWishId === wish._id ? "Deleting..." : "Confirm Delete"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[10px] font-semibold min-h-[30px] cursor-pointer"
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
                              <div className="p-3.5 rounded-xl bg-muted/40 border-l-4 border-primary text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed shadow-2xs font-normal">
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
                              <div className="pt-2 border-t border-border/60 space-y-2">
                                <div className="flex items-center justify-between">
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
                                            "min-h-[36px] sm:min-h-[38px] px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs hover:scale-110 active:scale-95",
                                            hasReacted
                                              ? "bg-primary/20 border-primary/50 text-primary font-black shadow-xs"
                                              : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                                          )}
                                        >
                                          <span className="text-sm">{emoji}</span>
                                          {count > 0 && <span className="text-[11px] font-black">{count}</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Explicit "Who Reacted" Named Breakdown */}
                                {wish.reactions && wish.reactions.length > 0 && (() => {
                                  const uniqueReactors = Array.from(
                                    new Set(wish.reactions.map((r) => r.userName))
                                  );
                                  return (
                                    <div className="pt-1 text-[11px] text-muted-foreground space-y-1.5 border-t border-border/40">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-foreground flex items-center gap-1.5">
                                          <i className="fa-solid fa-heart text-rose-500 text-[10px]" />
                                          <span>Reacted by ({uniqueReactors.length}):</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedReactorWishId((prev) =>
                                              prev === wish._id ? null : wish._id
                                            )
                                          }
                                          className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                        >
                                          {expandedReactorWishId === wish._id ? "Hide Details" : "View Details"}
                                        </button>
                                      </div>

                                      {/* Reactor name chips */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {uniqueReactors.map((name, nIdx) => {
                                          const userEmojis = (wish.reactions || [])
                                            .filter((r) => r.userName === name)
                                            .map((r) => r.emoji)
                                            .join(" ");
                                          return (
                                            <span
                                              key={nIdx}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-foreground font-medium border border-border/60"
                                            >
                                              <span>{name}</span>
                                              <span>{userEmojis}</span>
                                            </span>
                                          );
                                        })}
                                      </div>

                                      {/* Expanded Reactor Details Drawer */}
                                      {expandedReactorWishId === wish._id && (
                                        <div className="mt-1.5 p-2 rounded-lg bg-muted/40 border border-border/60 space-y-1 max-h-36 overflow-y-auto">
                                          {wish.reactions.map((r, rIdx) => (
                                            <div
                                              key={rIdx}
                                              className="flex items-center justify-between text-[10px] text-muted-foreground"
                                            >
                                              <span className="flex items-center gap-1.5 font-medium text-foreground">
                                                <span>{r.emoji}</span>
                                                <span>{r.userName}</span>
                                              </span>
                                              {r.createdAt && (
                                                <span>{new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 sm:p-12 text-center border rounded-2xl border-dashed border-border/80 space-y-3 bg-card/60">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center text-xl shadow-2xs">
                    <i className="fa-solid fa-cake-candles" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Select a Celebrant</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Choose a team member from the roster on the left to view their celebration wall, send a personalized greeting, or share photos.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setMobileActiveView("roster")}
                    className="lg:hidden text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-h-[38px] cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-left" />
                    <span>View Celebrants Roster</span>
                  </Button>
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
        <div className="space-y-4">
          {/* Header & Overview Card */}
          <Card className="p-4 sm:p-5 border-border shadow-xs bg-card space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-rose-500 text-base" />
                    <span>Company-Wide Wishes Moderation Desk</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                    <i className="fa-solid fa-lock text-[9px]" />
                    <span>Elevated Privileges</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit, inspect, filter, export, and moderate peer celebration greetings across all company departments.
                </p>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl self-start md:self-auto border border-border/60">
                <button
                  type="button"
                  onClick={() => setModerationViewMode("table")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px] transition-colors cursor-pointer",
                    moderationViewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                  title="Switch to Tabular Audit View"
                >
                  <i className="fa-solid fa-table-list" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModerationViewMode("cards")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px] transition-colors cursor-pointer",
                    moderationViewMode === "cards"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                  title="Switch to Mobile-Friendly Card Stack"
                >
                  <i className="fa-solid fa-grip" />
                  <span>Cards View</span>
                </button>
              </div>
            </div>

            {/* Moderation KPIs Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-comments text-sm sm:text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-black text-foreground truncate leading-tight">
                    {moderationKPIs.total}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-medium">
                    Total Wishes
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-camera-retro text-sm sm:text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-black text-foreground truncate leading-tight">
                    {moderationKPIs.photos}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-medium">
                    With Attachments
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-heart text-sm sm:text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-black text-foreground truncate leading-tight">
                    {moderationKPIs.reactions}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-medium">
                    Reactions Engaged
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-filter text-sm sm:text-base" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-black text-foreground truncate leading-tight">
                    {moderationKPIs.matches}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate font-medium">
                    Filtered Matches
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Control Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                  <Input
                    value={moderationSearch}
                    onChange={(e) => setModerationSearch(e.target.value)}
                    placeholder="Search recipient, sender, department, or message content..."
                    className="pl-8 pr-8 text-xs h-10 sm:h-9 min-h-[38px] w-full"
                  />
                  {moderationSearch && (
                    <button
                      type="button"
                      onClick={() => setModerationSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                      title="Clear search"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>

                {/* Export CSV & Reset */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportModerationCSV}
                    className="min-h-[38px] text-xs gap-1.5 border-border hover:bg-muted text-foreground cursor-pointer flex-1 sm:flex-initial"
                    title="Export filtered wishes to CSV for audit and compliance"
                  >
                    <i className="fa-solid fa-file-csv text-emerald-500 text-sm" />
                    <span>Export CSV</span>
                  </Button>

                  {(moderationSearch ||
                    moderationFilterType !== "all" ||
                    moderationFilterMedia !== "all" ||
                    moderationFilterYear !== "all" ||
                    moderationSortBy !== "newest") && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted min-h-[38px] cursor-pointer"
                      title="Reset all filters to default"
                    >
                      <i className="fa-solid fa-rotate-left" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Dimensional Filter Selectors */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
                {/* Type Filter */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5">Type:</span>
                  <button
                    type="button"
                    onClick={() => setModerationFilterType("all")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterType === "all" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterType("birthday")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 min-h-[30px]",
                      moderationFilterType === "birthday" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-cake-candles text-amber-400 text-[10px]" />
                    <span>Birthdays</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterType("anniversary")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 min-h-[30px]",
                      moderationFilterType === "anniversary" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-award text-indigo-400 text-[10px]" />
                    <span>Anniversaries</span>
                  </button>
                </div>

                {/* Media Filter */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5">Media:</span>
                  <button
                    type="button"
                    onClick={() => setModerationFilterMedia("all")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterMedia === "all" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterMedia("photos")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 min-h-[30px]",
                      moderationFilterMedia === "photos" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-image text-sky-400 text-[10px]" />
                    <span>Photos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterMedia("text")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterMedia === "text" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Text Only
                  </button>
                </div>

                {/* Year Filter */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5">Period:</span>
                  <button
                    type="button"
                    onClick={() => setModerationFilterYear("all")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterYear === "all" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterYear("current")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterYear === "current" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Current Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilterYear("prior")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationFilterYear === "prior" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Prior Years
                  </button>
                </div>

                {/* Sort Order */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5">Sort:</span>
                  <button
                    type="button"
                    onClick={() => setModerationSortBy("newest")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationSortBy === "newest" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationSortBy("oldest")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationSortBy === "oldest" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Oldest
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationSortBy("reactions")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors min-h-[30px]",
                      moderationSortBy === "reactions" ? "bg-card text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Top Reacted
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedWishIds.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-check-double text-rose-500 text-sm" />
                  <span className="font-bold text-foreground">
                    {selectedWishIds.length} celebration wish{selectedWishIds.length > 1 ? "es" : ""} selected for batch moderation
                  </span>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setBatchDeleteConfirmOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold min-h-[38px] gap-1.5 cursor-pointer shadow-xs flex-1 sm:flex-initial"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>Delete Selected ({selectedWishIds.length})</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWishIds([])}
                    className="text-xs min-h-[38px] border-border text-foreground hover:bg-muted cursor-pointer"
                  >
                    <span>Deselect All</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* VIEW 1: TABULAR AUDIT DESK */}
          {moderationViewMode === "table" && (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
              <table className="w-full text-left text-xs min-w-[920px]">
                <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredModerationWishes.length > 0 &&
                          filteredModerationWishes.every((w) => selectedWishIds.includes(w._id))
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer align-middle"
                        title="Select/Deselect all visible wishes"
                      />
                    </th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Sender</th>
                    <th className="p-3">Message Preview</th>
                    <th className="p-3">Type & Badge</th>
                    <th className="p-3">Media</th>
                    <th className="p-3">Reactions</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredModerationWishes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        <div className="space-y-2 max-w-sm mx-auto">
                          <i className="fa-solid fa-filter-circle-xmark text-3xl text-muted-foreground/50" />
                          <div className="font-bold text-foreground text-sm">No Celebration Wishes Found</div>
                          <p className="text-xs text-muted-foreground">
                            No wishes match the current search keywords or active filter parameters.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-2 text-xs min-h-[36px] gap-1.5"
                          >
                            <i className="fa-solid fa-rotate-left" />
                            <span>Reset Filters</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredModerationWishes.map((wish) => {
                      const stickerConfig = STICKER_CONFIG[wish.sticker] || STICKER_CONFIG.cake;
                      const isSelected = selectedWishIds.includes(wish._id);

                      return (
                        <tr
                          key={wish._id}
                          className={cn(
                            "transition-colors",
                            isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                          )}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectWish(wish._id)}
                              className="w-4 h-4 rounded border-border accent-primary cursor-pointer align-middle"
                            />
                          </td>

                          <td className="p-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              {wish.recipientPhotoUrl ? (
                                <Image
                                  src={wish.recipientPhotoUrl}
                                  alt={wish.recipientName || "Recipient"}
                                  width={26}
                                  height={26}
                                  className="w-6.5 h-6.5 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-6.5 h-6.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                                  {(wish.recipientName || "R")[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate max-w-[130px]">
                                  {wish.recipientName || "Recipient"}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                                  {wish.recipientDepartment || "General"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {wish.senderPhotoUrl ? (
                                <Image
                                  src={wish.senderPhotoUrl}
                                  alt={wish.senderName}
                                  width={26}
                                  height={26}
                                  className="w-6.5 h-6.5 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-6.5 h-6.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                                  {wish.senderName[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate max-w-[130px]">
                                  {wish.senderName}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                                  {wish.senderDepartment || "General"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 max-w-[260px]">
                            <button
                              type="button"
                              onClick={() => setInspectingWish(wish)}
                              className="text-left group cursor-pointer block w-full"
                              title="Click to inspect full celebration message"
                            >
                              <p className="truncate text-foreground/90 group-hover:text-primary transition-colors">
                                {wish.message}
                              </p>
                              <span className="text-[10px] text-muted-foreground group-hover:underline">
                                Inspect details →
                              </span>
                            </button>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", stickerConfig.color)}>
                              <i className={cn("fa-solid mr-1", stickerConfig.icon)} />
                              {wish.type}
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {wish.attachments && wish.attachments.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(wish.attachments[0].url)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold text-[11px] cursor-pointer transition-colors"
                                title="View attached photo in lightbox"
                              >
                                <i className="fa-solid fa-camera" />
                                <span>{wish.attachments.length} photo{wish.attachments.length > 1 ? "s" : ""}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="p-3">
                            {wish.reactions && wish.reactions.length > 0 ? (
                              <div className="space-y-1 max-w-[180px]">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {Array.from(new Set(wish.reactions.map((r) => r.emoji))).map((emoji) => {
                                    const count = wish.reactions.filter((r) => r.emoji === emoji).length;
                                    return (
                                      <span
                                        key={emoji}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] border border-border/60"
                                      >
                                        <span>{emoji}</span>
                                        <span className="font-bold">{count}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                                <p
                                  className="text-[10px] text-muted-foreground truncate"
                                  title={wish.reactions.map((r) => `${r.userName} (${r.emoji})`).join(", ")}
                                >
                                  {Array.from(new Set(wish.reactions.map((r) => r.userName))).join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                            {new Date(wish.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setInspectingWish(wish)}
                                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground border-border min-h-[32px] cursor-pointer"
                                title="Inspect Full Wish & Reactions"
                              >
                                <i className="fa-solid fa-eye text-xs" />
                              </Button>

                              {confirmDeleteId === wish._id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWish(wish._id)}
                                    disabled={deletingWishId === wish._id}
                                    className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold min-h-[32px] cursor-pointer"
                                  >
                                    {deletingWishId === wish._id ? "..." : "Confirm"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold min-h-[32px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmDeleteId(wish._id)}
                                  className="text-xs text-rose-500 hover:text-white hover:bg-rose-600 border-rose-500/30 min-h-[32px] gap-1 cursor-pointer"
                                  title="Permanently remove wish"
                                >
                                  <i className="fa-solid fa-trash-can text-xs" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: MOBILE-OPTIMIZED CARD STACK */}
          {moderationViewMode === "cards" && (
            <div>
              {filteredModerationWishes.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground border-border bg-card">
                  <div className="space-y-2 max-w-sm mx-auto">
                    <i className="fa-solid fa-filter-circle-xmark text-3xl text-muted-foreground/50" />
                    <div className="font-bold text-foreground text-sm">No Celebration Wishes Found</div>
                    <p className="text-xs text-muted-foreground">
                      No wishes match the current search keywords or active filter parameters.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs min-h-[36px] gap-1.5"
                    >
                      <i className="fa-solid fa-rotate-left" />
                      <span>Reset Filters</span>
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredModerationWishes.map((wish) => {
                    const stickerConfig = STICKER_CONFIG[wish.sticker] || STICKER_CONFIG.cake;
                    const isSelected = selectedWishIds.includes(wish._id);

                    return (
                      <Card
                        key={wish._id}
                        className={cn(
                          "p-4 border transition-all flex flex-col justify-between space-y-3 shadow-xs",
                          isSelected
                            ? "bg-primary/5 border-primary/40 shadow-sm"
                            : "bg-card border-border hover:border-border/80"
                        )}
                      >
                        {/* Top Card Meta */}
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectWish(wish._id)}
                              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                            />
                            <span className="text-[11px] text-muted-foreground font-medium">
                              Select
                            </span>
                          </label>

                          <div className="flex items-center gap-2">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", stickerConfig.color)}>
                              <i className={cn("fa-solid mr-1", stickerConfig.icon)} />
                              {wish.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(wish.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Recipient & Sender Chips */}
                        <div className="space-y-1.5 pt-1">
                          {/* Recipient */}
                          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-lg border border-border/50">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground w-6">To:</span>
                            {wish.recipientPhotoUrl ? (
                              <Image
                                src={wish.recipientPhotoUrl}
                                alt={wish.recipientName || "Recipient"}
                                width={22}
                                height={22}
                                className="w-5.5 h-5.5 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-5.5 h-5.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                                {(wish.recipientName || "R")[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-foreground truncate block">
                                {wish.recipientName || "Recipient"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              {wish.recipientDepartment || "General"}
                            </span>
                          </div>

                          {/* Sender */}
                          <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-lg border border-border/40">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground w-6">By:</span>
                            {wish.senderPhotoUrl ? (
                              <Image
                                src={wish.senderPhotoUrl}
                                alt={wish.senderName}
                                width={22}
                                height={22}
                                className="w-5.5 h-5.5 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-5.5 h-5.5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center">
                                {wish.senderName[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-foreground truncate block">
                                {wish.senderName}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                              {wish.senderDepartment || "General"}
                            </span>
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div
                          onClick={() => setInspectingWish(wish)}
                          className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 transition-colors cursor-pointer"
                          title="Click to view full celebration message"
                        >
                          <p className="text-xs text-foreground/90 leading-relaxed break-words line-clamp-3">
                            <i className="fa-solid fa-quote-left text-muted-foreground/30 text-[10px] mr-1.5" />
                            {wish.message}
                          </p>
                        </div>

                        {/* Photos Strip (if any) */}
                        {wish.attachments && wish.attachments.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                            {wish.attachments.map((att, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewImage(att.url)}
                                className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/70 hover:opacity-80 transition-opacity shrink-0 cursor-pointer"
                                title="Click to view full photo"
                              >
                                <Image
                                  src={att.url}
                                  alt={att.name || `Photo ${idx + 1}`}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                            <span className="text-[10px] text-sky-400 font-bold shrink-0">
                              {wish.attachments.length} attached
                            </span>
                          </div>
                        )}

                        {/* Reactions Strip (if any) */}
                        {wish.reactions && wish.reactions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
                            {Array.from(new Set(wish.reactions.map((r) => r.emoji))).map((emoji) => {
                              const count = wish.reactions.filter((r) => r.emoji === emoji).length;
                              return (
                                <span
                                  key={emoji}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] border border-border/60"
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold">{count}</span>
                                </span>
                              );
                            })}
                            <span className="text-[10px] text-muted-foreground truncate flex-1 text-right">
                              {wish.reactions.length} reaction{wish.reactions.length > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectingWish(wish)}
                            className="min-h-[38px] text-xs flex-1 gap-1.5 border-border hover:bg-muted cursor-pointer"
                          >
                            <i className="fa-solid fa-eye text-xs" />
                            <span>Inspect</span>
                          </Button>

                          {confirmDeleteId === wish._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteWish(wish._id)}
                                disabled={deletingWishId === wish._id}
                                className="px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold min-h-[38px] cursor-pointer"
                              >
                                {deletingWishId === wish._id ? "..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold min-h-[38px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDeleteId(wish._id)}
                              className="text-xs text-rose-500 hover:text-white hover:bg-rose-600 border-rose-500/30 min-h-[38px] gap-1.5 cursor-pointer px-3"
                              title="Delete this wish"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                              <span>Delete</span>
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Wish Inspection & Audit Modal ── */}
          {inspectingWish && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
              onClick={() => setInspectingWish(null)}
            >
              <div
                className="relative w-full max-w-xl max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-rose-500 text-base" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Celebration Wish Audit & Inspection
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        ID: {inspectingWish._id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingWish(null)}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
                    title="Close modal"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
                  {/* Recipient & Sender Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Recipient */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <i className="fa-solid fa-user-tag text-primary" />
                        <span>Celebrant / Recipient</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {inspectingWish.recipientPhotoUrl ? (
                          <Image
                            src={inspectingWish.recipientPhotoUrl}
                            alt={inspectingWish.recipientName || "Recipient"}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                            {(inspectingWish.recipientName || "R")[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground truncate">
                            {inspectingWish.recipientName || "Recipient"}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {inspectingWish.recipientDepartment || "General"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sender */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <i className="fa-solid fa-paper-plane text-sky-400" />
                        <span>Sender / Colleague</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {inspectingWish.senderPhotoUrl ? (
                          <Image
                            src={inspectingWish.senderPhotoUrl}
                            alt={inspectingWish.senderName}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">
                            {inspectingWish.senderName[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-foreground truncate">
                            {inspectingWish.senderName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {inspectingWish.senderDepartment || "General"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Celebration Message */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Celebration Message
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", (STICKER_CONFIG[inspectingWish.sticker] || STICKER_CONFIG.cake).color)}>
                        <i className={cn("fa-solid mr-1", (STICKER_CONFIG[inspectingWish.sticker] || STICKER_CONFIG.cake).icon)} />
                        {inspectingWish.type}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs sm:text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">
                      {inspectingWish.message}
                    </div>
                  </div>

                  {/* Photo Attachments (if any) */}
                  {inspectingWish.attachments && inspectingWish.attachments.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-images text-sky-400" />
                        <span>Attached Photos ({inspectingWish.attachments.length})</span>
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {inspectingWish.attachments.map((att, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewImage(att.url)}
                            className="relative aspect-square rounded-xl overflow-hidden border border-border hover:opacity-85 transition-opacity group cursor-pointer"
                            title="Click to zoom photo"
                          >
                            <Image
                              src={att.url}
                              alt={att.name || `Photo ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                              <i className="fa-solid fa-magnifying-glass-plus" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reaction Roster */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-heart text-rose-500" />
                      <span>Reactions & Engagement ({inspectingWish.reactions?.length || 0})</span>
                    </span>
                    {inspectingWish.reactions && inspectingWish.reactions.length > 0 ? (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60 divide-y divide-border/40 space-y-1.5">
                        {inspectingWish.reactions.map((reaction, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{reaction.emoji}</span>
                              <span className="font-semibold text-foreground">{reaction.userName}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(reaction.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No reactions logged for this celebration message yet.</p>
                    )}
                  </div>

                  {/* Technical Metadata */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-[10px] text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Posted Timestamp:</span>
                      <span className="font-mono text-foreground">{new Date(inspectingWish.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Celebration Year:</span>
                      <span className="font-mono text-foreground">{inspectingWish.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Celebrant Acknowledged:</span>
                      <span className="font-bold text-foreground">
                        {inspectingWish.acknowledged ? "Yes (Thanked)" : "Not yet acknowledged"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-3 sm:p-4 border-t border-border shrink-0 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const id = inspectingWish._id;
                      setInspectingWish(null);
                      setConfirmDeleteId(id);
                    }}
                    className="min-h-[38px] text-xs text-rose-500 hover:text-white hover:bg-rose-600 border-rose-500/30 gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>Delete Wish</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingWish(null)}
                    className="min-h-[38px] text-xs border-border text-foreground hover:bg-muted cursor-pointer"
                  >
                    Close Inspection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Bulk Delete Confirmation Modal ── */}
          {batchDeleteConfirmOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
              onClick={() => !isBatchDeleting && setBatchDeleteConfirmOpen(false)}
            >
              <div
                className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Confirm Bulk Deletion
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Permanent moderation action
                    </p>
                  </div>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-rose-500">{selectedWishIds.length} celebration wish{selectedWishIds.length > 1 ? "es" : ""}</strong>?
                  This action will immediately remove the greetings from the celebration wall and purge any attached photo files from server storage.
                </p>

                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400">
                  <i className="fa-solid fa-circle-exclamation mr-1.5" />
                  This operation cannot be reversed.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBatchDeleting}
                    onClick={() => setBatchDeleteConfirmOpen(false)}
                    className="min-h-[38px] text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBatchDeleting}
                    onClick={handleBatchDeleteWishes}
                    className="bg-rose-600 hover:bg-rose-700 text-white min-h-[38px] text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>{isBatchDeleting ? "Deleting..." : `Permanently Delete (${selectedWishIds.length})`}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── In-Page Photo Preview Modal / Lightbox ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden p-3 sm:p-4 shadow-2xl flex flex-col animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-1 pb-2 shrink-0 border-b border-border/60">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-image text-primary" />
                <span>Attached Photo Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
                title="Close preview"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl flex items-center justify-center p-2 min-h-0">
              <Image
                src={previewImage}
                alt="Enlarged photo preview"
                width={800}
                height={600}
                className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Commemorative Keepsake Card Interactive In-App Modal (Birthday Celebrant Only) ── */}
      {isKeepsakeModalOpen && selectedCelebrant && isBirthdayUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsKeepsakeModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#070b14] border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col animate-in zoom-in-95 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-amber-500/20 bg-amber-500/[0.04] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-sm shadow-xs">
                  <i className="fa-solid fa-certificate" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-2">
                    <span>Birthday Commemorative Keepsake Card</span>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      2026 Edition
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Official celebration memento preserving your team's greetings & accolades
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKeepsakeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
                title="Close Keepsake Card"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Modal Scrollable Canvas */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
              {/* Certificate Inner Frame */}
              <div className="relative p-5 sm:p-7 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-[#131b2e]/90 to-[#0a0f1d]/90 shadow-xl space-y-5">
                {/* Filigree Corner Icons */}
                <i className="fa-solid fa-star text-amber-400/50 absolute top-3 left-3 text-xs" />
                <i className="fa-solid fa-star text-amber-400/50 absolute top-3 right-3 text-xs" />
                <i className="fa-solid fa-star text-amber-400/50 absolute bottom-3 left-3 text-xs" />
                <i className="fa-solid fa-star text-amber-400/50 absolute bottom-3 right-3 text-xs" />

                {/* Celebrant Hero Spotlight */}
                <div className="text-center space-y-3 pt-1">
                  <div className="relative inline-block mx-auto">
                    {selectedCelebrant.photoUrl ? (
                      <Image
                        src={selectedCelebrant.photoUrl}
                        alt={selectedCelebrant.name}
                        width={84}
                        height={84}
                        className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-3 border-amber-400 shadow-lg shadow-amber-500/20"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 text-2xl font-black flex items-center justify-center border-3 border-amber-300 shadow-lg shadow-amber-500/20">
                        {selectedCelebrant.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-amber-400 flex items-center justify-center text-xs shadow-md">
                      🎂
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 tracking-tight font-serif">
                      {selectedCelebrant.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                      {selectedCelebrant.department} · {selectedCelebrant.role}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mt-2">
                      <i className="fa-solid fa-cake-candles text-[11px]" />
                      <span>
                        Birthday Celebration · {MONTH_NAMES[selectedCelebrant.month - 1]} {selectedCelebrant.day}, 2026
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300/90 italic max-w-lg mx-auto leading-relaxed border-y border-amber-500/20 py-3 my-2">
                    “Presented with sincere appreciation and warmest birthday cheers by your colleagues and team at NexAce. May this milestone year bring you monumental success, vibrant health, and memorable celebrations!”
                  </p>
                </div>

                {/* Milestone Summary Metrics */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-lg sm:text-xl font-black text-amber-300">
                      {celebrantWishes.length}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Wishes
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-lg sm:text-xl font-black text-rose-400">
                      {celebrantWishes.reduce((acc, w) => acc + (w.reactions?.length || 0), 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Reactions
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <div className="text-lg sm:text-xl font-black text-sky-400">
                      {celebrantWishes.reduce((acc, w) => acc + (w.attachments?.length || 0), 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Photos
                    </div>
                  </div>
                </div>

                {/* Team Greetings Roster */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <i className="fa-solid fa-heart text-rose-400" />
                      <span>Colleague Wishes ({celebrantWishes.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Official Record
                    </span>
                  </div>

                  {celebrantWishes.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic">
                      No peer wishes recorded yet. Be sure to check back as team greetings arrive!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {celebrantWishes.map((w) => {
                        const stickerInfo = STICKER_CONFIG[w.sticker] || STICKER_CONFIG.cake;
                        return (
                          <div
                            key={w._id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {w.senderPhotoUrl ? (
                                  <Image
                                    src={w.senderPhotoUrl}
                                    alt={w.senderName}
                                    width={26}
                                    height={26}
                                    className="w-6.5 h-6.5 rounded-full object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-6.5 h-6.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                                    {w.senderName[0]}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-slate-100 truncate">
                                    {w.senderName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {w.senderDepartment || "Colleague"}
                                  </div>
                                </div>
                              </div>
                              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0", stickerInfo.color)}>
                                <i className={cn("fa-solid mr-1", stickerInfo.icon)} />
                                {stickerInfo.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-200/90 italic leading-relaxed break-words line-clamp-3">
                              “{w.message}”
                            </p>

                            {w.attachments && w.attachments.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1">
                                {w.attachments.map((att, idx) => (
                                  <div
                                    key={idx}
                                    className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0"
                                  >
                                    <Image
                                      src={att.url}
                                      alt={att.name || `Photo ${idx + 1}`}
                                      width={40}
                                      height={40}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {w.reactions && w.reactions.length > 0 && (
                              <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                                {Array.from(new Set(w.reactions.map((r) => r.emoji))).map((emoji) => (
                                  <span
                                    key={emoji}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px]"
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-bold">{w.reactions.filter((r) => r.emoji === emoji).length}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Certificate Footer Seal */}
                <div className="pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider">
                    <i className="fa-solid fa-shield text-amber-400" />
                    <span>NexAce CRM Verified Celebration Keepsake</span>
                  </div>
                  <span>Issued on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Fixed Actions */}
            <div className="p-4 sm:p-5 border-t border-amber-500/20 bg-amber-500/[0.04] shrink-0 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsKeepsakeModalOpen(false)}
                className="min-h-[40px] text-xs font-semibold border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <span>Close</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleExportKeepsake}
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm min-h-[40px] px-6 gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 transition-all"
                title="Print your commemorative keepsake card or save as high-res PDF"
              >
                <i className="fa-solid fa-print text-sm" />
                <span>Print / Save as PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
