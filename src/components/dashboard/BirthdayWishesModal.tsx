"use client";

import React, { useState, useEffect, useMemo } from "react";

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
  recipientPhotoUrl?: string;
  recipientDepartment?: string;
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

interface BirthdayWishesModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishes: BirthdayWishItem[];
  sentWishes?: BirthdayWishItem[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  onThankAllSuccess?: () => void;
  onWishDeleted?: (wishId: string) => void;
  initialTab?: "received" | "sent" | "company";
}

const EMOJI_OPTIONS = ["❤️", "🍰", "🥳", "🙏", "🔥"];

const STICKER_ICON_MAP: Record<string, string> = {
  cake: "fa-cake-candles text-amber-500",
  balloons: "fa-heart text-pink-500",
  cheers: "fa-champagne-glasses text-purple-500",
  star: "fa-star text-yellow-500",
  gift: "fa-gift text-emerald-500",
};

export function BirthdayWishesModal({
  isOpen,
  onClose,
  wishes: initialWishes,
  sentWishes: initialSentWishes,
  currentUserId,
  currentUserName,
  currentUserRole,
  onThankAllSuccess,
  onWishDeleted,
  initialTab = "received",
}: BirthdayWishesModalProps) {
  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<"received" | "sent" | "company">(initialTab);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Wishes collections
  const [receivedWishes, setReceivedWishes] = useState<BirthdayWishItem[]>(initialWishes || []);
  const [sentWishes, setSentWishes] = useState<BirthdayWishItem[]>(initialSentWishes || []);
  const [companyWishes, setCompanyWishes] = useState<BirthdayWishItem[]>([]);
  const [loadingScope, setLoadingScope] = useState(false);

  // Expanded reactor breakdown per wish
  const [expandedReactorWishId, setExpandedReactorWishId] = useState<string | null>(null);

  // Action states
  const [thankingAll, setThankingAll] = useState(false);
  const [thankSuccess, setThankSuccess] = useState(false);
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<WishAttachment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sync initial props
  useEffect(() => {
    if (initialWishes) setReceivedWishes(initialWishes);
  }, [initialWishes]);

  useEffect(() => {
    if (initialSentWishes) setSentWishes(initialSentWishes);
  }, [initialSentWishes]);

  // Load sent or company wishes on-demand when switching tabs
  useEffect(() => {
    if (!isOpen) return;

    const fetchScopeData = async () => {
      if (activeTab === "sent" && sentWishes.length === 0) {
        setLoadingScope(true);
        try {
          const res = await fetch(`/api/birthdays/wish?scope=sent&year=${selectedYear}`);
          if (res.ok) {
            const data = await res.json();
            setSentWishes(data.wishes || []);
          }
        } catch (err) {
          console.error("Failed to fetch sent wishes:", err);
        } finally {
          setLoadingScope(false);
        }
      } else if (activeTab === "company" && companyWishes.length === 0) {
        setLoadingScope(true);
        try {
          const res = await fetch(`/api/birthdays/wish?scope=company&year=${selectedYear}`);
          if (res.ok) {
            const data = await res.json();
            setCompanyWishes(data.wishes || []);
          }
        } catch (err) {
          console.error("Failed to fetch company wishes feed:", err);
        } finally {
          setLoadingScope(false);
        }
      }
    };

    fetchScopeData();
  }, [activeTab, isOpen, selectedYear, sentWishes.length, companyWishes.length]);

  // Determine current working list based on tab
  const currentList = useMemo(() => {
    if (activeTab === "sent") return sentWishes;
    if (activeTab === "company") return companyWishes;
    return receivedWishes;
  }, [activeTab, receivedWishes, sentWishes, companyWishes]);

  // Extract available years across all wishes for filtering
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    [...receivedWishes, ...sentWishes, ...companyWishes].forEach((w) => {
      if (w.year) yearsSet.add(w.year);
    });
    const currentYr = new Date().getFullYear();
    yearsSet.add(currentYr);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [receivedWishes, sentWishes, companyWishes]);

  // Filtered list by year and search query
  const filteredWishes = useMemo(() => {
    return currentList.filter((wish) => {
      const matchYear = selectedYear === "all" || wish.year.toString() === selectedYear;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        wish.senderName?.toLowerCase().includes(query) ||
        wish.recipientName?.toLowerCase().includes(query) ||
        wish.senderDepartment?.toLowerCase().includes(query) ||
        wish.message?.toLowerCase().includes(query);
      return matchYear && matchQuery;
    });
  }, [currentList, selectedYear, searchQuery]);

  // Keyboard navigation for Lightbox (Esc, Arrow Left/Right)
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  if (!isOpen) return null;

  const openLightbox = (attachments: WishAttachment[], initialIdx: number) => {
    const imagesOnly = attachments.filter((a) => a.type === "image");
    if (imagesOnly.length === 0) return;
    setLightboxImages(imagesOnly);
    setLightboxIndex(initialIdx);
    setLightboxOpen(true);
  };

  const handleNextLightbox = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const handlePrevLightbox = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const handleToggleReaction = async (wishId: string, emoji: string) => {
    try {
      const res = await fetch("/api/birthdays/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishId, emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        const updater = (prev: BirthdayWishItem[]) =>
          prev.map((w) => (w._id === wishId ? { ...w, reactions: data.reactions } : w));

        setReceivedWishes(updater);
        setSentWishes(updater);
        setCompanyWishes(updater);
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handleThankEveryone = async () => {
    setThankingAll(true);
    try {
      const res = await fetch("/api/birthdays/thank-all", {
        method: "POST",
      });
      if (res.ok) {
        setThankSuccess(true);
        setReceivedWishes((prev) => prev.map((w) => ({ ...w, acknowledged: true })));
        if (onThankAllSuccess) onThankAllSuccess();
      }
    } catch (err) {
      console.error("Failed to send thank-you notes:", err);
    } finally {
      setThankingAll(false);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!window.confirm("Are you sure you want to remove this celebration wish?")) return;
    setDeletingWishId(wishId);
    try {
      const res = await fetch(`/api/birthdays/wish?id=${wishId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReceivedWishes((prev) => prev.filter((w) => w._id !== wishId));
        setSentWishes((prev) => prev.filter((w) => w._id !== wishId));
        setCompanyWishes((prev) => prev.filter((w) => w._id !== wishId));
        if (onWishDeleted) onWishDeleted(wishId);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete wish");
      }
    } catch (err) {
      console.error("Delete wish error:", err);
      alert("An unexpected error occurred while deleting the wish.");
    } finally {
      setDeletingWishId(null);
    }
  };

  const formatWishDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between shrink-0 bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                <i className="fa-solid fa-cake-candles" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground leading-tight">
                    Celebration Wishes & History Wall
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {filteredWishes.length} {filteredWishes.length === 1 ? "Wish" : "Wishes"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Full history of team wishes, milestone accolades, and who reacted
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 ml-2 cursor-pointer"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>

          {/* Scope Navigation Tabs */}
          <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-border/60 bg-card shrink-0 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("received")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] ${
                  activeTab === "received"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="fa-solid fa-inbox text-pink-500" />
                <span>Received</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
                  {receivedWishes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] ${
                  activeTab === "sent"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="fa-solid fa-paper-plane text-indigo-500" />
                <span>Sent by Me</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
                  {sentWishes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("company")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] ${
                  activeTab === "company"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="fa-solid fa-users text-amber-500" />
                <span>Company Wall</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
                  {companyWishes.length}
                </span>
              </button>
            </div>

            {/* Year Filters */}
            <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                Year:
              </span>
              <button
                type="button"
                onClick={() => setSelectedYear("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer min-h-[30px] ${
                  selectedYear === "all"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All Time
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr.toString())}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer min-h-[30px] ${
                    selectedYear === yr.toString()
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Search Filter Strip */}
          <div className="px-4 sm:px-5 py-2 border-b border-border/40 bg-muted/10 shrink-0">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wishes by colleague name, department, or keywords..."
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[34px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>

          {/* Body: Social Wall Feed */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
            {loadingScope ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
                <p className="text-xs font-semibold">Loading celebration wishes history...</p>
              </div>
            ) : filteredWishes.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-2xl text-muted-foreground/50">
                  <i className="fa-solid fa-envelope-open" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    {searchQuery ? "No matching wishes found" : "No wishes recorded for this view"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    {activeTab === "received"
                      ? "Celebration wishes sent to you by teammates will be preserved here indefinitely."
                      : activeTab === "sent"
                      ? "Wishes you post to colleagues will be tracked here along with their reactions."
                      : "Company celebration milestones and kudos will appear on this team wall."}
                  </p>
                </div>
              </div>
            ) : (
              filteredWishes.map((wish) => {
                const stickerIcon = STICKER_ICON_MAP[wish.sticker] || STICKER_ICON_MAP.cake;

                // Group reactions by emoji and extract reactor names
                const reactionCounts: Record<
                  string,
                  { count: number; hasMyReaction: boolean; names: string[] }
                > = {};
                (wish.reactions || []).forEach((r) => {
                  if (!reactionCounts[r.emoji]) {
                    reactionCounts[r.emoji] = { count: 0, hasMyReaction: false, names: [] };
                  }
                  reactionCounts[r.emoji].count += 1;
                  reactionCounts[r.emoji].names.push(r.userName);
                  if (r.userId?.toString() === currentUserId) {
                    reactionCounts[r.emoji].hasMyReaction = true;
                  }
                });

                // Unique list of reactors for this wish
                const uniqueReactors = Array.from(new Set((wish.reactions || []).map((r) => r.userName)));

                const isMine = wish.senderId === currentUserId;
                const isRecipient = wish.recipientId === currentUserId;
                const canDelete = isMine || isRecipient || ["Admin", "HR", "OPS"].includes(currentUserRole || "");

                return (
                  <div
                    key={wish._id}
                    className="p-4 rounded-2xl border border-border/80 bg-card/70 hover:border-primary/40 transition-all space-y-3 shadow-2xs"
                  >
                    {/* Header: Who Wished & Who was Wished */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Sender Photo / Initials */}
                        {wish.senderPhotoUrl ? (
                          <img
                            src={wish.senderPhotoUrl}
                            alt={wish.senderName}
                            className="w-10 h-10 rounded-full object-cover border border-border shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs shrink-0 border border-indigo-500/30">
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
                            <span className="text-xs sm:text-sm font-bold text-foreground">
                              {wish.senderName}
                            </span>
                            {wish.senderDepartment && (
                              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted font-medium">
                                {wish.senderDepartment}
                              </span>
                            )}
                            {/* Target Celebrant (if in Sent or Company tab) */}
                            {(activeTab === "sent" || activeTab === "company") && wish.recipientName && (
                              <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                                <i className="fa-solid fa-arrow-right text-[9px] text-muted-foreground" />
                                <span>{wish.recipientName}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                            <span>{formatWishDate(wish.createdAt)}</span>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                              {wish.type === "birthday" ? "🎂 Birthday" : "🏆 Anniversary"}
                            </span>
                            <span>·</span>
                            <span className="font-semibold">{wish.year}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div
                          className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-sm border border-border/50"
                          title={wish.sticker}
                        >
                          <i className={`fa-solid ${stickerIcon}`} />
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWish(wish._id)}
                            disabled={deletingWishId === wish._id}
                            className="w-8 h-8 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete wish"
                          >
                            <i
                              className={`fa-solid ${
                                deletingWishId === wish._id ? "fa-spinner fa-spin" : "fa-trash-can"
                              } text-xs`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pl-2.5 border-l-2 border-primary/30">
                      {wish.message}
                    </p>

                    {/* Attached Photo Gallery */}
                    {wish.attachments && wish.attachments.length > 0 && (
                      <div
                        className={`grid gap-2 pt-1 ${
                          wish.attachments.length === 1
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {wish.attachments.map((att, idx) => {
                          if (att.type === "image") {
                            return (
                              <div
                                key={idx}
                                onClick={() => openLightbox(wish.attachments, idx)}
                                className="group relative rounded-xl overflow-hidden aspect-video bg-muted border border-border cursor-pointer hover:shadow-md transition-all"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
                                  <i className="fa-solid fa-magnifying-glass-plus" />
                                  <span>View Photo</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted flex items-center gap-2 text-xs text-foreground transition-all"
                            >
                              <i className="fa-solid fa-file-pdf text-red-500 text-base shrink-0" />
                              <span className="truncate flex-1 text-[11px] font-medium">{att.name}</span>
                              <i className="fa-solid fa-download text-muted-foreground text-[10px]" />
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Who Reacted & Reactions Bar ── */}
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Active Reaction Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Object.entries(reactionCounts).map(([emoji, data]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(wish._id, emoji)}
                              className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[30px] ${
                                data.hasMyReaction
                                  ? "bg-primary/15 border border-primary/40 text-primary font-bold shadow-2xs"
                                  : "bg-muted border border-border text-foreground hover:bg-muted/80"
                              }`}
                              title={data.names.join(", ")}
                            >
                              <span>{emoji}</span>
                              <span className="text-[11px] font-bold">{data.count}</span>
                            </button>
                          ))}
                        </div>

                        {/* Quick Emoji Reaction Strip */}
                        <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1 border border-border/40">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(wish._id, emoji)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:scale-125 transition-transform cursor-pointer"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Explicit "Who Reacted" Named Breakdown */}
                      {uniqueReactors.length > 0 && (
                        <div className="pt-1 text-[11px] text-muted-foreground space-y-1">
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
                                  className="px-2 py-0.5 rounded-full bg-muted/80 border border-border/60 text-foreground font-medium text-[10px] flex items-center gap-1 shadow-2xs"
                                >
                                  <span>{name}</span>
                                  <span className="font-normal">{userEmojis}</span>
                                </span>
                              );
                            })}
                          </div>

                          {/* Expanded Full Reactor Log */}
                          {expandedReactorWishId === wish._id && (
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 animate-in fade-in duration-150 mt-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                Full Reaction Activity Log
                              </span>
                              <div className="space-y-1 max-h-36 overflow-y-auto overscroll-contain pr-1">
                                {(wish.reactions || []).map((r, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="flex items-center justify-between text-[11px] py-1 border-b border-border/30 last:border-0"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm">{r.emoji}</span>
                                      <span className="font-semibold text-foreground">{r.userName}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatWishDate(r.createdAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 bg-muted/20">
            {activeTab === "received" && receivedWishes.length > 0 && (
              <button
                type="button"
                onClick={handleThankEveryone}
                disabled={thankingAll || thankSuccess}
                className={`w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                  thankSuccess
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-pink-600 hover:bg-pink-700 text-white"
                }`}
              >
                {thankSuccess ? (
                  <>
                    <i className="fa-solid fa-check" />
                    <span>Heartfelt Thanks Sent! ❤️</span>
                  </>
                ) : thankingAll ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    <span>Sending Kudos...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-heart" />
                    <span>Thank Everyone ❤️</span>
                  </>
                )}
              </button>
            )}

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Preserving all celebration history & reactor logs across all company dashboards
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[40px] px-5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors ml-auto cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Photo Lightbox Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
          {/* Lightbox Topbar */}
          <div className="flex items-center justify-between text-white shrink-0 px-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/90 border border-white/15">
                Photo {lightboxIndex + 1} of {lightboxImages.length}
              </span>
              <span className="text-[11px] text-white/50 hidden md:inline">
                (Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/80">Esc</kbd> to exit, <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/80">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/80">→</kbd> to navigate)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImages[lightboxIndex].url}
                download={lightboxImages[lightboxIndex].name}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Download Photo"
              >
                <i className="fa-solid fa-download text-sm" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Lightbox"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Preview */}
          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <img
              src={lightboxImages[lightboxIndex].url}
              alt={lightboxImages[lightboxIndex].name}
              className="max-h-[68vh] sm:max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all"
            />

            {lightboxImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevLightbox}
                  className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all min-h-[44px] cursor-pointer shadow-lg border border-white/10"
                  title="Previous Photo"
                >
                  <i className="fa-solid fa-chevron-left text-base" />
                </button>
                <button
                  type="button"
                  onClick={handleNextLightbox}
                  className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all min-h-[44px] cursor-pointer shadow-lg border border-white/10"
                  title="Next Photo"
                >
                  <i className="fa-solid fa-chevron-right text-base" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Caption & Thumbnails Carousel */}
          <div className="text-center py-2 shrink-0 space-y-2">
            <p className="text-xs text-white/70 truncate max-w-md mx-auto">
              {lightboxImages[lightboxIndex].name}
            </p>

            {/* Thumbnail Navigation Strip */}
            {lightboxImages.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      lightboxIndex === idx
                        ? "border-primary scale-110 shadow-md ring-2 ring-primary/40"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
