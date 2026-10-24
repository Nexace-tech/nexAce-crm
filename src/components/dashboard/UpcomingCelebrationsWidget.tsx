"use client";

import React, { useState, useEffect } from "react";
import { SendBirthdayWishModal, SendWishCelebrant } from "./SendBirthdayWishModal";
import { BirthdayWishesModal, BirthdayWishItem } from "./BirthdayWishesModal";
import { CelebrationsConfettiCanvas } from "@/components/calendar/CelebrationsConfettiCanvas";

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
    sentWishes?: BirthdayWishItem[];
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
  const [sentWishes, setSentWishes] = useState<BirthdayWishItem[]>([]);
  const [wishesSentThisYear, setWishesSentThisYear] = useState<SentWishRecord[]>([]);

  // Confetti Particle Explosion
  const [confettiTrigger, setConfettiTrigger] = useState<number | null>(null);

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
        setSentWishes(data.sentWishes || []);
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
            sentWishes: data.sentWishes || [],
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
        ? `🏆 Happy Work Anniversary, ${item.name}! ✨ Wishing you continued milestones, growth, and triumphs with our team! 🥂👏`
        : `🎂 Happy Birthday, ${item.name}! ✨ Wishing you a fantastic day filled with joy, laughter, and great memories! 🎈🎁`;

    // 1. Copy raw text directly to clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(greetingText).catch(() => {});
    }

    // 2. Direct routing without wa.me 302 redirect emoji corruption
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    const encodedText = encodeURIComponent(greetingText);
    if (isMobile) {
      const mobileUrl = cleanPhone
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
        : `whatsapp://send?text=${encodedText}`;
      window.location.href = mobileUrl;
    } else {
      const webUrl = cleanPhone
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isWishAlreadySent = (userId: string, type: "birthday" | "anniversary") => {
    return wishesSentThisYear.some(
      (w) => w.recipientId === userId && w.type === type
    );
  };

  const currentTodayList = activeTab === "birthday" ? todayBirthdays : todayAnniversaries;
  const currentUpcomingList = activeTab === "birthday" ? upcomingBirthdays : upcomingAnniversaries;
  const isFridayToday = new Date().getDay() === 5;
  const totalCelebrationsToday = todayBirthdays.length + todayAnniversaries.length;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-pink-500/[0.03] p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-pink-500/30 transition-all duration-300 flex flex-col justify-between ${className}`}
      >
        {/* Confetti Explosion Canvas */}
        <CelebrationsConfettiCanvas triggerKey={confettiTrigger} duration={3600} />

        {/* Header & Dual Tabs */}
        <div className="pb-3.5 border-b border-border/60 space-y-2.5">
          {/* Top Bar: Icon + Title + Live Badge + Confetti Popper */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center text-sm shadow-xs shrink-0">
                <i className="fa-solid fa-cake-candles" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
                    Celebrations
                  </h3>
                  {totalCelebrationsToday > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 shadow-2xs shrink-0 whitespace-nowrap">
                      {totalCelebrationsToday} Today! 🎉
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Confetti Popper Button */}
            <button
              type="button"
              onClick={() => setConfettiTrigger(Date.now())}
              className="w-8 h-8 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Celebrate with Confetti!"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-xs" />
            </button>
          </div>

          {/* Full-Width Segmented Tab Switcher (50% / 50% Grid) */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/50 gap-1 w-full">
            <button
              type="button"
              onClick={() => setActiveTab("birthday")}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[34px] cursor-pointer ${
                activeTab === "birthday"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <i className="fa-solid fa-cake-candles text-amber-500 text-xs shrink-0" />
              <span className="truncate">Birthdays</span>
              {todayBirthdays.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("anniversary")}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[34px] cursor-pointer ${
                activeTab === "anniversary"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <i className="fa-solid fa-award text-indigo-500 text-xs shrink-0" />
              <span className="truncate">Anniversaries</span>
              {todayAnniversaries.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Widget Content Body */}
        <div className="pt-3.5 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-lg text-indigo-500" />
              <span className="text-xs font-medium">Loading celebrations...</span>
            </div>
          ) : (
            <>
              {/* 1. Today Celebrants Section */}
              {currentTodayList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
                    <span>Celebrating Today! 🥳</span>
                  </div>

                  <div className="space-y-2.5">
                    {currentTodayList.map((item) => {
                      const isSelf = item.userId === currentUserId;
                      const alreadySent = isWishAlreadySent(item.userId, item.type);

                      return (
                        <div
                          key={item.userId}
                          className="p-3 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-indigo-500/5 flex items-center justify-between gap-2.5 shadow-xs hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              {item.photoUrl ? (
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/70 ring-offset-2 ring-offset-background animate-pulse shadow-md"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-md ring-2 ring-pink-500/60 ring-offset-2 ring-offset-background animate-pulse">
                                  {item.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 text-xs drop-shadow-xs">
                                {activeTab === "anniversary" ? "🏆" : "🎂"}
                              </span>
                            </div>

                            <div className="min-w-0 truncate">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                                  {item.name}
                                </h4>
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-pink-500 text-white shadow-2xs shrink-0">
                                    You!
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                                <span className="truncate">{item.milestoneText ? item.milestoneText : item.department}</span>
                              </p>
                            </div>
                          </div>

                          {/* Actions for Colleagues */}
                          {!isSelf && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleWhatsAppQuickShare(item)}
                                className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs shrink-0"
                                title="Send instant WhatsApp greeting"
                              >
                                <i className="fa-brands fa-whatsapp text-sm" />
                              </button>

                              {alreadySent ? (
                                <span className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap">
                                  <i className="fa-solid fa-check text-[10px]" />
                                  <span>Wish Sent</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSendWish(item)}
                                  className="min-h-[32px] px-3 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-[11px] font-bold shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
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
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5 shadow-2xs">
                      <i className="fa-solid fa-bell text-sm shrink-0 text-amber-500" />
                      <span className="font-medium">
                        Colleagues are celebrating this weekend! Send your wishes early or wish them on WhatsApp.
                      </span>
                    </div>
                  )}

                {/* 2. Upcoming List (1 to 14 Days) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-days text-indigo-500 text-[11px]" />
                      <span>Upcoming (Next 14 Days)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold">
                      {currentUpcomingList.length}
                    </span>
                  </div>

                  {currentUpcomingList.length === 0 ? (
                    <div className="p-5 rounded-2xl border border-dashed border-border/70 text-center text-xs text-muted-foreground space-y-1 bg-muted/10">
                      <i className="fa-solid fa-calendar-check text-2xl text-muted-foreground/40 mb-1 block" />
                      <p className="font-semibold text-foreground">All clear for the next two weeks!</p>
                      <p className="text-[11px]">No upcoming {activeTab === "birthday" ? "birthdays" : "anniversaries"} in the next 14 days.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-56 overflow-y-auto overscroll-contain pr-1">
                      {currentUpcomingList.map((item) => (
                        <div
                          key={item.userId}
                          className="py-2.5 flex items-center justify-between gap-3 group hover:bg-muted/30 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center text-xs shrink-0 border border-border">
                                {item.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="truncate">
                              <h5 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                {item.name}
                              </h5>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.milestoneText ? item.milestoneText : item.department}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                item.daysRemaining === 1
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-muted text-muted-foreground border border-border/50"
                              }`}
                            >
                              {item.displayDate}
                            </span>

                            {/* Pre-wish or WhatsApp button */}
                            {item.userId !== currentUserId && (
                              <button
                                type="button"
                                onClick={() => handleOpenSendWish(item)}
                                className="w-8 h-8 rounded-lg border border-border/80 hover:border-pink-500/50 hover:bg-pink-500/10 text-muted-foreground hover:text-pink-600 flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                                title="Send celebration wish early"
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

        {/* Footer Link / View Celebration Wishes History Wall */}
        <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWishesModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shadow-2xs min-h-[36px]"
          >
            <i className="fa-solid fa-comments text-indigo-500" />
            <span>Wishes History Wall</span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              {receivedWishes.length + sentWishes.length}
            </span>
          </button>

          <span className="text-[11px] text-muted-foreground font-medium">
            {receivedWishes.length} Received · {sentWishes.length} Sent
          </span>
        </div>
      </div>

      {/* Send Wish Modal */}
      <SendBirthdayWishModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        celebrant={selectedCelebrant}
        onWishSent={() => {
          setConfettiTrigger(Date.now());
          fetchCelebrations();
        }}
      />

      {/* Received & Sent Wishes History Modal */}
      <BirthdayWishesModal
        isOpen={wishesModalOpen}
        onClose={() => setWishesModalOpen(false)}
        wishes={receivedWishes}
        sentWishes={sentWishes}
        currentUserId={currentUserId || ""}
        currentUserName={currentUserName || "You"}
        currentUserRole={currentUserRole}
        onThankAllSuccess={fetchCelebrations}
        onWishDeleted={fetchCelebrations}
      />
    </>
  );
}
