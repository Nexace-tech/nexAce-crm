"use client";

import React, { useState } from "react";

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
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  onThankAllSuccess?: () => void;
  onWishDeleted?: (wishId: string) => void;
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
  currentUserId,
  currentUserName,
  currentUserRole,
  onThankAllSuccess,
  onWishDeleted,
}: BirthdayWishesModalProps) {
  const [wishes, setWishes] = useState<BirthdayWishItem[]>(initialWishes);
  const [thankingAll, setThankingAll] = useState(false);
  const [thankSuccess, setThankSuccess] = useState(false);
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxImages, setLightboxImages] = useState<WishAttachment[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Update internal wishes whenever initialWishes changes
  React.useEffect(() => {
    setWishes(initialWishes);
  }, [initialWishes]);

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
        setWishes((prev) =>
          prev.map((w) => {
            if (w._id === wishId) {
              return { ...w, reactions: data.reactions };
            }
            return w;
          })
        );
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
        setWishes((prev) => prev.map((w) => ({ ...w, acknowledged: true })));
        if (onThankAllSuccess) onThankAllSuccess();
      }
    } catch (err) {
      console.error("Failed to send thank-you notes:", err);
    } finally {
      setThankingAll(false);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!window.confirm("Are you sure you want to delete this celebration wish?")) return;
    setDeletingWishId(wishId);
    try {
      const res = await fetch(`/api/birthdays/wish?id=${wishId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWishes((prev) => prev.filter((w) => w._id !== wishId));
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
        <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between shrink-0 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
                <i className="fa-solid fa-cake-candles" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                    Celebration Wishes Wall
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    {wishes.length} {wishes.length === 1 ? "Wish" : "Wishes"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Warm words and shared memories from your teammates
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>

          {/* Body: Social Wall Feed */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
            {wishes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-2xl text-muted-foreground/50">
                  <i className="fa-solid fa-envelope-open" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">No wishes received yet</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Celebration wishes sent by your colleagues will appear here with photos and reactions!
                  </p>
                </div>
              </div>
            ) : (
              wishes.map((wish) => {
                const stickerIcon = STICKER_ICON_MAP[wish.sticker] || STICKER_ICON_MAP.cake;

                // Group reactions by emoji
                const reactionCounts: Record<string, { count: number; hasMyReaction: boolean; names: string[] }> = {};
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

                return (
                  <div
                    key={wish._id}
                    className="p-4 rounded-2xl border border-border/80 bg-card/60 hover:bg-muted/10 transition-all space-y-3"
                  >
                    {/* Sender Info & Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {wish.senderPhotoUrl ? (
                          <img
                            src={wish.senderPhotoUrl}
                            alt={wish.senderName}
                            className="w-9 h-9 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                            {wish.senderName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-foreground">
                              {wish.senderName}
                            </span>
                            {wish.senderDepartment && (
                              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-sm bg-muted">
                                {wish.senderDepartment}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatWishDate(wish.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-sm" title={wish.sticker}>
                          <i className={`fa-solid ${stickerIcon}`} />
                        </div>
                        {(wish.senderId === currentUserId ||
                          wish.recipientId === currentUserId ||
                          ["Admin", "HR", "OPS"].includes(currentUserRole || "")) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWish(wish._id)}
                            disabled={deletingWishId === wish._id}
                            className="w-8 h-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                            title="Delete wish"
                          >
                            <i className={`fa-solid ${deletingWishId === wish._id ? "fa-spinner fa-spin" : "fa-trash-can"} text-xs`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {wish.message}
                    </p>

                    {/* Attached Photo Thumbnails Grid */}
                    {wish.attachments && wish.attachments.length > 0 && (
                      <div className={`grid gap-2 mt-2 ${wish.attachments.length === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
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
                                  <span>View</span>
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

                    {/* Emoji Reaction Bar */}
                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      {/* Active Reaction Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Object.entries(reactionCounts).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(wish._id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all min-h-[28px] ${
                              data.hasMyReaction
                                ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                                : "bg-muted border border-border text-foreground hover:bg-muted/80"
                            }`}
                            title={data.names.join(", ")}
                          >
                            <span>{emoji}</span>
                            <span className="text-[11px]">{data.count}</span>
                          </button>
                        ))}
                      </div>

                      {/* Quick Emoji Picker */}
                      <div className="flex items-center gap-1 bg-muted/50 rounded-full px-2 py-1 border border-border/40">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(wish._id, emoji)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:scale-125 transition-transform"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 bg-muted/20">
            {wishes.length > 0 && (
              <button
                type="button"
                onClick={handleThankEveryone}
                disabled={thankingAll || thankSuccess}
                className={`w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
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

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[40px] px-5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Photo Lightbox Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/90 flex flex-col justify-between p-4 backdrop-blur-md animate-in fade-in duration-200">
          {/* Lightbox Topbar */}
          <div className="flex items-center justify-between text-white shrink-0">
            <span className="text-xs font-medium text-white/80">
              Photo {lightboxIndex + 1} of {lightboxImages.length}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={lightboxImages[lightboxIndex].url}
                download={lightboxImages[lightboxIndex].name}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Download Photo"
              >
                <i className="fa-solid fa-download text-sm" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
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
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition-all"
            />

            {lightboxImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevLightbox}
                  className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all min-h-[44px]"
                  title="Previous Photo"
                >
                  <i className="fa-solid fa-chevron-left text-base" />
                </button>
                <button
                  type="button"
                  onClick={handleNextLightbox}
                  className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all min-h-[44px]"
                  title="Next Photo"
                >
                  <i className="fa-solid fa-chevron-right text-base" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Caption / Thumbnails Carousel */}
          <div className="text-center py-2 shrink-0">
            <p className="text-xs text-white/70 truncate max-w-md mx-auto">
              {lightboxImages[lightboxIndex].name}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
