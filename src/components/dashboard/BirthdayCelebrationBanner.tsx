"use client";

import React, { useState } from "react";
import { CelebrationsConfettiCanvas } from "@/components/calendar/CelebrationsConfettiCanvas";

interface BirthdayCelebrationBannerProps {
  isMyBirthday: boolean;
  isMyAnniversary: boolean;
  userName: string;
  milestoneText?: string;
  wishesCount: number;
  onOpenWishes: () => void;
  onThankEveryone: () => void;
}

export function BirthdayCelebrationBanner({
  isMyBirthday,
  isMyAnniversary,
  userName,
  milestoneText,
  wishesCount,
  onOpenWishes,
  onThankEveryone,
}: BirthdayCelebrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState<number | null>(Date.now());
  const [hasThanked, setHasThanked] = useState(false);
  const [isThanking, setIsThanking] = useState(false);

  if (dismissed || (!isMyBirthday && !isMyAnniversary)) return null;

  // Personalized Headline
  let headline = `Happy Birthday, ${userName}! 🎉`;
  let subtext = "The entire team is celebrating you today! Wishing you a fantastic year full of happiness, health, and big wins!";
  let badgeLabel = "Birthday Celebration";
  let iconClass = "fa-cake-candles";

  if (isMyBirthday && isMyAnniversary) {
    headline = `Double Celebration, ${userName}! 🎂🏆`;
    subtext = `Happy Birthday and Happy Work Anniversary (${milestoneText || "Special Milestone"})! Thank you for being such an extraordinary heart of our team!`;
    badgeLabel = "Dual Celebration Milestone";
    iconClass = "fa-champagne-glasses";
  } else if (isMyAnniversary) {
    headline = `Happy Work Anniversary, ${userName}! 🏆`;
    subtext = `Celebrating your ${milestoneText || "Work Anniversary"}! Thank you for your dedication, brilliance, and tremendous contributions to our journey!`;
    badgeLabel = milestoneText || "Work Anniversary";
    iconClass = "fa-award";
  }

  const handleThankClick = async () => {
    if (hasThanked || isThanking) return;
    setIsThanking(true);
    try {
      await onThankEveryone();
      setHasThanked(true);
      setConfettiTrigger(Date.now());
    } finally {
      setIsThanking(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 backdrop-blur-md p-4 sm:p-5 shadow-lg transition-all mb-6">
      {/* Deluxe Particle Physics Canvas Overlay */}
      <CelebrationsConfettiCanvas
        triggerKey={confettiTrigger}
        duration={4200}
        mode="mixed"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Avatar & Message */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-md shrink-0 animate-bounce duration-1000">
            <i className={`fa-solid ${iconClass}`} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs">
                {badgeLabel}
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                <span>Today is your special day!</span>
                <span>✨</span>
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-foreground mt-1 truncate">
              {headline}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              {subtext}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          {/* Confetti Trigger Button */}
          <button
            type="button"
            onClick={() => setConfettiTrigger(Date.now())}
            className="w-10 h-10 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-600 dark:text-pink-400 border border-pink-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xs shrink-0"
            title="Fire Confetti Cannons!"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-sm" />
          </button>

          <button
            type="button"
            onClick={onOpenWishes}
            className="flex-1 md:flex-initial min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-envelope-open-text text-sm" />
            <span>View Wishes ({wishesCount})</span>
          </button>

          <button
            type="button"
            onClick={handleThankClick}
            disabled={hasThanked || isThanking}
            className={`flex-1 md:flex-initial min-h-[40px] px-4 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              hasThanked
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 hover:scale-[1.02] active:scale-95"
            }`}
          >
            <i className={`fa-solid ${hasThanked ? "fa-circle-check" : "fa-heart"} text-sm text-pink-500`} />
            <span>{hasThanked ? "Thanked! ❤️" : isThanking ? "Sending..." : "Thank Everyone ❤️"}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer ml-1"
            title="Dismiss banner"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
