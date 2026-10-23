"use client";

import React, { useState, useEffect } from "react";
import { SendBirthdayWishModal, SendWishCelebrant } from "./SendBirthdayWishModal";
import { BirthdayWishesModal, BirthdayWishItem } from "./BirthdayWishesModal";

export interface CelebrationItem {
  userId: string;
  name: string;
  photoUrl?: string;
  department: string;
  role: string;
  phone?: string;
  type: "birthday" | "anniversary";
  celebrationDate: string;
  displayDate: string;
  daysRemaining: number;
  dayOfWeek: string;
  isWeekend: boolean;
  milestoneText?: string;
  milestoneYears?: number;
}

interface SentWishRecord {
  recipientId: string;
  type: "birthday" | "anniversary";
}

export function UpcomingCelebrationsWidget({
  className = "",
  currentUserId,
  currentUserName,
  currentUserRole,
  onCelebrationStateLoaded,
}: {
  className?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  onCelebrationStateLoaded?: (data: {
    isMyBirthday: boolean;
    isMyAnniversary: boolean;
    wishesCount: number;
    receivedWishes: BirthdayWishItem[];
    milestoneText?: string;
  }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"birthday" | "anniversary">("birthday");
  const [loading, setLoading] = useState(true);

  // Celebrations data
  const [todayBirthdays, setTodayBirthdays] = useState<CelebrationItem[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<CelebrationItem[]>([]);
  const [todayAnniversaries, setTodayAnniversaries] = useState<CelebrationItem[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<CelebrationItem[]>([]);
  const [receivedWishes, setReceivedWishes] = useState<BirthdayWishItem[]>([]);
  const [wishesSentThisYear, setWishesSentThisYear] = useState<SentWishRecord[]>([]);

  // Modals state
  const [selectedCelebrant, setSelectedCelebrant] = useState<SendWishCelebrant | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [wishesModalOpen, setWishesModalOpen] = useState(false);

  const fetchCelebrations = async () => {
    try {
      const res = await fetch("/api/birthdays");
      if (res.ok) {
        const data = await res.json();
        setTodayBirthdays(data.todayBirthdays || []);
        setUpcomingBirthdays(data.upcomingBirthdays || []);
        setTodayAnniversaries(data.todayAnniversaries || []);
        setUpcomingAnniversaries(data.upcomingAnniversaries || []);
        setReceivedWishes(data.receivedWishes || []);
        setWishesSentThisYear(data.wishesSentThisYear || []);

        if (onCelebrationStateLoaded) {
          const myAnniv = data.todayAnniversaries?.find(
            (a: CelebrationItem) => a.userId === currentUserId
          );
          onCelebrationStateLoaded({
            isMyBirthday: !!data.isMyBirthday,
            isMyAnniversary: !!data.isMyAnniversary,
            wishesCount: (data.receivedWishes || []).length,
            receivedWishes: data.receivedWishes || [],
            milestoneText: myAnniv?.milestoneText,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load celebrations widget data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCelebrations();
  }, [currentUserId]);

  const handleOpenSendWish = (item: CelebrationItem) => {
    setSelectedCelebrant({
      userId: item.userId,
      name: item.name,
      photoUrl: item.photoUrl,
      department: item.department,
      phone: item.phone,
      type: item.type,
      milestoneText: item.milestoneText,
    });
    setSendModalOpen(true);
  };

  const handleWhatsAppQuickShare = (item: CelebrationItem) => {
    let cleanPhone = (item.phone || "").replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.slice(1);
    if (!cleanPhone.startsWith("+") && cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const greetingText =
      item.type === "anniversary"
        ? `🏆 *Happy Work Anniversary, ${item.name}!* ✨ Wishing you continued milestones, growth, and triumphs with the team! 🥂👏`
        : `🎉 *Happy Birthday, ${item.name}!* 🎂✨ Wishing you a fantastic day filled with joy, laughter, and great memories! 🎈🎁`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greetingText)}`
      : `https://wa.me/?text=${encodeURIComponent(greetingText)}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const isWishAlreadySent = (userId: string, type: "birthday" | "anniversary") => {
    return wishesSentThisYear.some(
      (w) => w.recipientId === userId && w.type === type
    );
  };

  const currentTodayList = activeTab === "birthday" ? todayBirthdays : todayAnniversaries;
  const currentUpcomingList = activeTab === "birthday" ? upcomingBirthdays : upcomingAnniversaries;
  const isFridayToday = new Date().getDay() === 5;

  return (
    <>
      <div
        className={`rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between ${className}`}
      >
        {/* Header & Dual Tabs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-cake-candles" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Celebrations Engine
                  </h3>
                  {todayBirthdays.length + todayAnniversaries.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                      {todayBirthdays.length + todayAnniversaries.length} Today!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground hidden sm:block">
                  Birthdays &amp; work anniversary recognition
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("birthday")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[34px] ${
                  activeTab === "birthday"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="fa-solid fa-cake-candles text-amber-500" />
                <span>Birthdays</span>
                {todayBirthdays.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("anniversary")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[34px] ${
                  activeTab === "anniversary"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className="fa-solid fa-award text-indigo-500" />
                <span>Anniversaries</span>
                {todayAnniversaries.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Widget Content Body */}
          <div className="pt-4 space-y-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin text-lg text-indigo-500" />
                <span className="text-xs">Loading celebrations...</span>
              </div>
            ) : (
              <>
                {/* 1. Today Celebrants Section */}
                {currentTodayList.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                      <span>Celebrating Today! 🥳</span>
                    </div>

                    <div className="space-y-2.5">
                      {currentTodayList.map((item) => {
                        const isSelf = item.userId === currentUserId;
                        const alreadySent = isWishAlreadySent(item.userId, item.type);

                        return (
                          <div
                            key={item.userId}
                            className="p-3.5 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {item.photoUrl ? (
                                  <img
                                    src={item.photoUrl}
                                    alt={item.name}
                                    className="w-11 h-11 rounded-full object-cover border-2 border-pink-500"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-pink-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    {item.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 text-xs">
                                  {activeTab === "anniversary" ? "🏆" : "🎂"}
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-foreground">
                                    {item.name}
                                  </h4>
                                  {isSelf && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500 text-white">
                                      You!
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.milestoneText ? item.milestoneText : item.department}
                                </p>
                              </div>
                            </div>

                            {/* Actions for Colleagues */}
                            {!isSelf && (
                              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppQuickShare(item)}
                                  className="w-9 h-9 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all"
                                  title="Send instant WhatsApp greeting"
                                >
                                  <i className="fa-brands fa-whatsapp text-sm" />
                                </button>

                                {alreadySent ? (
                                  <span className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
                                    <i className="fa-solid fa-check text-xs" />
                                    <span>Wish Sent</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSendWish(item)}
                                    className="flex-1 sm:flex-initial min-h-[36px] px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                                  >
                                    <i className="fa-solid fa-gift text-xs" />
                                    <span>Send Wish</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Friday Weekend Banner Highlight */}
                {isFridayToday &&
                  currentUpcomingList.some((u) => u.isWeekend && u.daysRemaining <= 2) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                      <i className="fa-solid fa-bell shrink-0" />
                      <span>
                        Colleagues are celebrating this weekend! Send your wishes early or wish them on WhatsApp.
                      </span>
                    </div>
                  )}

                {/* 2. Upcoming List (1 to 14 Days) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Upcoming (Next 14 Days)</span>
                    <span>{currentUpcomingList.length}</span>
                  </div>

                  {currentUpcomingList.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                      No upcoming {activeTab === "birthday" ? "birthdays" : "anniversaries"} in the next 14 days.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-56 overflow-y-auto overscroll-contain pr-1">
                      {currentUpcomingList.map((item) => (
                        <div
                          key={item.userId}
                          className="py-2.5 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs shrink-0">
                                {item.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="truncate">
                              <h5 className="font-semibold text-xs text-foreground truncate">
                                {item.name}
                              </h5>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.milestoneText ? item.milestoneText : item.department}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                item.daysRemaining === 1
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.displayDate}
                            </span>

                            {/* Pre-wish or WhatsApp button */}
                            {item.userId !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => handleOpenSendWish(item)}
                                className="w-7 h-7 rounded-lg border border-border/80 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-600 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100"
                                title="Send celebration wish"
                              >
                                <i className="fa-solid fa-gift text-xs" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Link / View Received Wishes */}
        {receivedWishes.length > 0 && (
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setWishesModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
            >
              <i className="fa-solid fa-envelope-open-text" />
              <span>View Wishes Received ({receivedWishes.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Send Wish Modal */}
      <SendBirthdayWishModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        celebrant={selectedCelebrant}
        onWishSent={fetchCelebrations}
      />

      {/* Received Wishes Modal */}
      <BirthdayWishesModal
        isOpen={wishesModalOpen}
        onClose={() => setWishesModalOpen(false)}
        wishes={receivedWishes}
        currentUserId={currentUserId || ""}
        currentUserName={currentUserName || "You"}
        currentUserRole={currentUserRole}
        onThankAllSuccess={fetchCelebrations}
        onWishDeleted={fetchCelebrations}
      />
    </>
  );
}
