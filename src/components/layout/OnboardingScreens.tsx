"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { NativeService } from "@/lib/native/nativeService";

interface OnboardingScreen {
  id: number;
  badge: string;
  badgeIcon: string;
  titleLight: string;
  titleHighlight: string;
  titleEnd: string;
  description: string;
  imageSrc: string;
  features: string[];
}

const ONBOARDING_SCREENS: OnboardingScreen[] = [
  {
    id: 1,
    badge: "Operations & Attendance",
    badgeIcon: "fa-solid fa-clock",
    titleLight: "Work From Anywhere With",
    titleHighlight: "Ease & Clarity",
    titleEnd: "Every Day",
    description:
      "Punch in with one tap, track active shift hours in real-time IST, record breaks, and submit daily work logs seamlessly.",
    imageSrc: "/Onboarding_Screen/Screen_1.png",
    features: [
      "1-Click Clock-In & Geo-aware shift tracker",
      "Automatic work hour & break logging",
      "Shift calendar & roster overview",
    ],
  },
  {
    id: 2,
    badge: "Agile Projects & Collaboration",
    badgeIcon: "fa-solid fa-folder-tree",
    titleLight: "Stay Synchronized",
    titleHighlight: "With Your Team",
    titleEnd: "In One Hub",
    description:
      "Move tasks across Kanban boards, collaborate in team chat channels, and manage sprint deliveries with complete clarity.",
    imageSrc: "/Onboarding_Screen/Screen_2.png",
    features: [
      "Visual Kanban boards & Sprint planning",
      "Direct & channel team messaging with video huddles",
      "Centralized project drive document vault",
    ],
  },
  {
    id: 3,
    badge: "Intelligence & Alerts",
    badgeIcon: "fa-solid fa-chart-line",
    titleLight: "Stay Informed When",
    titleHighlight: "Work Happens",
    titleEnd: "In Real Time",
    description:
      "Receive real-time notifications, view live company KPI metrics, and celebrate accomplishments with team kudos.",
    imageSrc: "/Onboarding_Screen/Screen_3.png",
    features: [
      "Smart push alerts & broadcast announcements",
      "Live analytics dashboard & delivery performance",
      "Performance feedback, goals & peer kudos",
    ],
  },
];

interface OnboardingScreensProps {
  isAppLocked?: boolean;
}

export function OnboardingScreens({ isAppLocked = false }: OnboardingScreensProps) {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(isAppLocked);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // If app is locked to onboarding, it is unconditionally open
  useEffect(() => {
    if (isAppLocked) {
      setIsOpen(true);
      return;
    }
    if (!user?._id) return;
    const key = `nexace_onboarding_completed_${user._id}`;
    const completed = localStorage.getItem(key);
    if (completed) return;

    // Detect native app (Capacitor iOS/Android) or standalone PWA or mobile app viewport
    const isNativeApp = NativeService.isNative();
    const isStandaloneApp = typeof window !== "undefined" && (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
    const isMobileDevice = typeof window !== "undefined" && (
      isNativeApp ||
      isStandaloneApp ||
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );

    if (isMobileDevice) {
      setIsOpen(true);
    }
  }, [user?._id, isAppLocked]);

  // Listen to custom event so user can replay onboarding anytime from Guide/Help menu
  useEffect(() => {
    const handleReplay = () => {
      setCurrentIndex(0);
      setIsOpen(true);
    };
    window.addEventListener("replay-onboarding", handleReplay);
    return () => window.removeEventListener("replay-onboarding", handleReplay);
  }, []);

  const handleFinish = useCallback(() => {
    NativeService.haptic("success");
    if (isAppLocked) {
      // In locked app mode, looping back to first screen or staying on final screen smoothly
      setCurrentIndex(0);
      return;
    }
    setIsOpen(false);
    if (user?._id) {
      localStorage.setItem(`nexace_onboarding_completed_${user._id}`, "true");
    }
  }, [user?._id, isAppLocked]);

  const handleNext = () => {
    if (animating) return;
    NativeService.haptic("light");
    if (currentIndex < ONBOARDING_SCREENS.length - 1) {
      setDirection("next");
      setAnimating(true);
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => setAnimating(false), 300);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (animating) return;
    NativeService.haptic("light");
    if (currentIndex > 0) {
      setDirection("prev");
      setAnimating(true);
      setCurrentIndex((prev) => prev - 1);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  // Keyboard arrow keys navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleFinish();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, animating]);

  if (!isOpen) return null;

  const currentScreen = ONBOARDING_SCREENS[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Onboarding Tour"
    >
      {/* Background ambient lighting effects matching NexAce brand */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00c5a0]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>

      {/* Main Device Frame Container with Clean Background Image */}
      <div className="relative w-full max-w-[420px] sm:max-w-[440px] h-[680px] sm:h-[720px] max-h-[92vh] border border-slate-700/60 rounded-[36px] shadow-2xl shadow-black/95 flex flex-col overflow-hidden bg-white">
        
        {/* Pure Image Background Layer - No overlay */}
        <div className="absolute inset-0 z-0">
          <img
            key={currentScreen.imageSrc}
            src={currentScreen.imageSrc}
            alt={currentScreen.badge}
            className="w-full h-full object-cover object-top select-none pointer-events-none transition-opacity duration-300"
          />
        </div>

        {/* Dynamic Slide Content Container - Aligned to bottom */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-6 pt-2">
          {/* Centered Content Card constrained directly to the arch width */}
          <div className="w-full max-w-[340px] mx-auto">
            {/* Typography & Copy Section */}
            <div className="space-y-2 text-left">
              {/* Category Pill Tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00c5a0]/15 border border-[#00c5a0]/40 text-[#008080] text-[10px] font-bold shadow-sm backdrop-blur-sm">
                <i className={cn(currentScreen.badgeIcon, "text-[9px]")} />
                <span>{currentScreen.badge}</span>
              </div>

              {/* Smaller Headline */}
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                {currentScreen.titleLight}{" "}
                <span className="text-[#008080]">{currentScreen.titleHighlight}</span>{" "}
                {currentScreen.titleEnd}
              </h2>

              {/* Smaller Subtext description */}
              <p className="text-[11px] sm:text-xs text-slate-700 font-medium leading-relaxed">
                {currentScreen.description}
              </p>

              {/* Highlights bullet list */}
              <div className="pt-1 space-y-1 text-left">
                {currentScreen.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-800 font-medium">
                    <i className="fa-solid fa-circle-check text-[#00a383] text-[10px] shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls & Pagination Dots - Always anchored at the bottom */}
          <div className="w-full max-w-[340px] mx-auto pt-4 flex items-center justify-between gap-3">
            {/* Indicator Dots */}
            <div className="flex items-center gap-1.5">
              {ONBOARDING_SCREENS.map((screen, idx) => (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                    idx === currentIndex
                      ? "w-6 bg-[#00c5a0] shadow-sm shadow-[#00c5a0]/60"
                      : "w-1.5 bg-slate-400/60 hover:bg-slate-500"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Action Buttons: Prev / Next */}
            <div className="flex items-center gap-1.5">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-xl border border-slate-300/80 bg-white/90 text-slate-700 hover:text-slate-950 hover:bg-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm"
                  aria-label="Previous step"
                >
                  <i className="fa-solid fa-arrow-left text-[10px]" />
                </button>
              )}

              <Button
                color="primary"
                onClick={handleNext}
                className={cn(
                  "font-bold text-[11px] gap-1.5 rounded-xl shadow-md transition-all cursor-pointer",
                  currentIndex === ONBOARDING_SCREENS.length - 1
                    ? "px-4 h-8 bg-[#00c5a0] hover:bg-[#00c5a0]/90 text-slate-950 shadow-[#00c5a0]/40"
                    : "w-8 h-8 p-0 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                )}
                aria-label={
                  currentIndex === ONBOARDING_SCREENS.length - 1
                    ? isAppLocked
                      ? "Replay Tour"
                      : "Get Started"
                    : "Next step"
                }
              >
                {currentIndex === ONBOARDING_SCREENS.length - 1 ? (
                  isAppLocked ? (
                    <>
                      <span>Replay</span>
                      <i className="fa-solid fa-rotate-right text-[10px]" />
                    </>
                  ) : (
                    <>
                      <span>Get Started</span>
                      <i className="fa-solid fa-check text-[10px]" />
                    </>
                  )
                ) : (
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
