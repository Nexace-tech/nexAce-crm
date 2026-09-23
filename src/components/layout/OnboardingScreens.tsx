"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
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

const LAST_INDEX = ONBOARDING_SCREENS.length - 1;
const ANIM_DURATION_MS = 250;

interface OnboardingScreensProps {
  isAppLocked?: boolean;
  isFullScreen?: boolean;
  /** Called when the user taps "Get Started" on the final slide (native app mode) */
  onDone?: () => void;
}

export function OnboardingScreens({ isAppLocked = false, isFullScreen = false, onDone }: OnboardingScreensProps) {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(isAppLocked || isFullScreen);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isMobile, setIsMobile] = useState(true);

  // Stable ref to abort pending animation timers on unmount
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unified viewport + native detection
  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 768 || NativeService.isNative());
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Open logic: locked/fullscreen always open; otherwise show for mobile/native/PWA
  useEffect(() => {
    if (isAppLocked || isFullScreen) {
      setIsOpen(true);
      return;
    }
    if (!user?._id) return;
    const key = `nexace_onboarding_completed_${user._id}`;
    if (localStorage.getItem(key)) return;

    const isNativeApp = NativeService.isNative();

    // On native apps, NativeAppGate manages the onboarding flow before the user
    // reaches the dashboard. If we're here (authenticated, no isAppLocked), it
    // means the user already completed onboarding. Mark it done and bail out to
    // prevent the tour from re-appearing on top of the dashboard.
    if (isNativeApp) {
      localStorage.setItem(key, "true");
      return;
    }

    const isStandaloneApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (
      isStandaloneApp ||
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ) {
      setIsOpen(true);
    }
  }, [user?._id, isAppLocked, isFullScreen]);

  // Cleanup animation timer on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Listen for replay event from Guide/Help menu
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
      // Native app: hand off to the parent (NativeAppGate) to show login
      if (onDone) {
        onDone();
      } else {
        // Fallback: replay the tour if no callback provided
        setCurrentIndex(0);
      }
      return;
    }
    setIsOpen(false);
    if (user?._id) {
      localStorage.setItem(`nexace_onboarding_completed_${user._id}`, "true");
    }
  }, [user, isAppLocked, onDone]);

  /** Trigger a slide transition with animation guard and timer cleanup */
  const triggerTransition = useCallback(
    (dir: "next" | "prev", nextIndex: number) => {
      setDirection(dir);
      setAnimating(true);
      setCurrentIndex(nextIndex);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setAnimating(false), ANIM_DURATION_MS);
    },
    []
  );

  const handleNext = useCallback(() => {
    if (animating) return;
    NativeService.haptic("light");
    if (currentIndex < LAST_INDEX) {
      triggerTransition("next", currentIndex + 1);
    } else {
      handleFinish();
    }
  }, [animating, currentIndex, triggerTransition, handleFinish]);

  const handlePrev = useCallback(() => {
    if (animating || currentIndex === 0) return;
    NativeService.haptic("light");
    triggerTransition("prev", currentIndex - 1);
  }, [animating, currentIndex, triggerTransition]);

  // Keyboard navigation — stable handlers via useCallback avoid stale closures
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") handleFinish();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleFinish]);

  // Derived state — memoized to avoid recomputation on unrelated renders
  const useFullScreenMode = useMemo(
    () => isAppLocked || isFullScreen || isMobile,
    [isAppLocked, isFullScreen, isMobile]
  );

  const currentScreen = useMemo(() => ONBOARDING_SCREENS[currentIndex], [currentIndex]);

  const isLastScreen = currentIndex === LAST_INDEX;

  if (!isOpen) return null;

  // Content of the Onboarding screen
  const screenContent = (
    <div
      className={cn(
        "relative w-full h-full flex flex-col justify-between overflow-hidden select-none",
        useFullScreenMode
          ? "fixed inset-0 z-[99999] min-h-[100dvh]"
          : "max-w-[420px] h-[720px] max-h-[92vh] rounded-[36px] shadow-2xl border border-slate-200/50"
      )}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f2fbf8 40%, #eefbf9 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Onboarding Tour"
    >
      {/* Top Artwork Illustration Section */}
      <div
        className="relative w-full flex-1 max-h-[50vh] sm:max-h-[52vh] flex items-end justify-center overflow-hidden px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        <img
          key={currentScreen.imageSrc}
          src={currentScreen.imageSrc}
          alt={currentScreen.badge}
          className={cn(
            "w-full h-full max-h-[46vh] sm:max-h-[48vh] object-contain object-bottom pointer-events-none select-none transition-all duration-300",
            animating ? "opacity-0 scale-95" : "opacity-100 scale-100"
          )}
        />
      </div>

      {/* Bottom Content Area */}
      <div
        className="w-full max-w-[380px] mx-auto px-6 flex flex-col justify-end flex-shrink-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.75rem)" }}
      >
        {/* Typography & Copy Section */}
        <div
          className={cn(
            "space-y-2 text-left transition-all duration-300",
            animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}
        >
          {/* Category Pill Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00c5a0]/15 border border-[#00c5a0]/40 text-[#00796b] text-xs font-bold shadow-sm backdrop-blur-sm">
            <i className={cn(currentScreen.badgeIcon, "text-[11px]")} />
            <span>{currentScreen.badge}</span>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
            {currentScreen.titleLight}{" "}
            <span className="text-[#008080] font-extrabold">{currentScreen.titleHighlight}</span>{" "}
            {currentScreen.titleEnd}
          </h2>

          {/* Subtext description */}
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {currentScreen.description}
          </p>

          {/* Highlights bullet list */}
          <div className="pt-2 space-y-2 text-left">
            {currentScreen.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 font-semibold">
                <i className="fa-solid fa-circle-check text-[#00a383] text-sm shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Controls: Indicator Dots on left & Action Button on right */}
        <div className="pt-6 flex items-center justify-between gap-4">
          {/* Indicator Dots */}
          <div className="flex items-center gap-2">
            {ONBOARDING_SCREENS.map((screen, idx) => (
              <button
                key={screen.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  idx === currentIndex
                    ? "w-8 bg-[#00c5a0] shadow-sm shadow-[#00c5a0]/60"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons: Prev (if > 0) + Next Arrow Button */}
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="w-12 h-12 rounded-2xl border border-slate-300/80 bg-white/90 text-slate-700 hover:text-slate-950 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm"
                aria-label="Previous step"
              >
                <i className="fa-solid fa-arrow-left text-sm" />
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={cn(
                "rounded-2xl transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-lg",
                isLastScreen
                  ? "px-5 h-12 bg-[#00c5a0] hover:bg-[#00c5a0]/90 text-slate-950 font-bold text-xs sm:text-sm gap-2 shadow-[#00c5a0]/40"
                  : "w-14 h-12 bg-[#0f172a] hover:bg-[#1e293b] text-white"
              )}
              aria-label={isLastScreen ? "Get Started" : "Next step"}
            >
              {isLastScreen ? (
                <>
                  <span>Get Started</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </>
              ) : (
                <i className="fa-solid fa-arrow-right text-base text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop preview mode: wrap in centered modal backdrop
  if (!useFullScreenMode) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
        {screenContent}
      </div>
    );
  }

  return screenContent;
}
