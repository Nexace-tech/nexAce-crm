"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { OnboardingScreens } from "@/components/layout/OnboardingScreens";

interface NativeAppGateProps {
  children: React.ReactNode;
}

/**
 * "splash"    — Branded launch screen shown while we check localStorage +
 *               session in parallel (min 600 ms so branding registers).
 * "onboarding"— First-ever launch: 3-slide onboarding tour.
 * "ready"     — Renders normal Next.js children.
 *               • Authenticated users land on /dashboard (server redirect).
 *               • Unauthenticated users are sent to /login by the app router.
 *
 * BLANK SCREEN FIX:
 *   The splash overlay sits on top of children at all times.
 *   When the min timer + session check complete we fade the splash OUT
 *   while the real content underneath is already mounted and rendering.
 *   This eliminates the gap between splash fade-out and content mount.
 */
type NativeAppState = "splash" | "onboarding" | "ready";

const ONBOARDING_DONE_KEY = "nexace_native_onboarding_done";
const MIN_SPLASH_MS = 600;

/** Branded full-screen launch splash — instant hide when content is ready */
function SplashOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #f0fdf9 0%, #e6faf4 50%, #d8f5ed 100%)",
        opacity: visible ? 1 : 0,
        // Instant hide — no fade. Content is already mounted underneath,
        // so a transition would create a blank gap during the fade.
        transition: "opacity 0ms ease",
        visibility: visible ? "visible" : "hidden",
        // Once invisible, let touch events pass through to the content below
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: "linear-gradient(135deg, #00c5a0 0%, #008080 100%)",
          boxShadow: "0 12px 40px rgba(0, 197, 160, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <i className="fa-solid fa-layer-group" style={{ color: "#fff", fontSize: 32 }} />
      </div>

      {/* Brand name */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          color: "#0f172a",
          fontFamily: "Inter, system-ui, sans-serif",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        NexAce <span style={{ color: "#00c5a0" }}>CRM</span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 500,
          letterSpacing: "0.3px",
          marginBottom: 56,
        }}
      >
        The Unified Workspace
      </div>

      {/* 3-dot pulse loader */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)",
          display: "flex",
          gap: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#00c5a0",
              opacity: 0.7,
              animation: `nexace-splash-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Inline keyframes — no extra CSS file needed */}
      <style>{`
        @keyframes nexace-splash-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%            { transform: scale(1);   opacity: 1;    }
        }
      `}</style>
    </div>
  );
}

export function NativeAppGate({ children }: NativeAppGateProps) {
  // Resolved synchronously — no re-render, no flash
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  });

  const [appState, setAppState] = useState<NativeAppState>("splash");
  // Controls the CSS opacity of the overlay — false = fading out
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    if (!isNative) {
      // Web browser — no splash at all, go straight to children
      setSplashVisible(false);
      setAppState("ready");
      return;
    }

    // Hide the native OS splash screen smoothly now that web SplashOverlay is mounted
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});

    const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === "true";

    if (!onboardingDone) {
      // First-ever launch — after min splash time, mount onboarding IMMEDIATELY.
      // The onboarding background (#eefbf9) matches the splash, so an instant
      // swap is visually seamless — no fade needed, no blank gap.
      const timer = setTimeout(() => {
        setAppState("onboarding");          // mount onboarding under the overlay
        setSplashVisible(false);            // instant swap — same bg color
      }, MIN_SPLASH_MS);
      return () => clearTimeout(timer);
    }

    // Returning user — session check runs in parallel with min timer
    const sessionCheck = fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .catch(() => ({ user: null }));

    const minDelay = new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_SPLASH_MS)
    );

    // When both complete, fade splash — content is already rendered underneath
    Promise.all([sessionCheck, minDelay]).then(() => {
      setSplashVisible(false);             // begin 350ms CSS fade-out
      // No need to delay setAppState — children are already mounted under the overlay
      setAppState("ready");
    });
  }, [isNative]);

  // ── Web browser: skip gate entirely ────────────────────────────────────────
  if (!isNative) {
    return <>{children}</>;
  }

  // ── Native: always render the correct content layer first,
  //    then place the SplashOverlay on top — it fades out revealing the content.
  // ──────────────────────────────────────────────────────────────────────────

  if (appState === "onboarding") {
    return (
      <>
        <div
          className="fixed inset-0 z-[9999] w-full h-full overflow-hidden"
          style={{ background: "#eefbf9" }}
        >
          <OnboardingScreens
            isAppLocked={true}
            isFullScreen={true}
            onDone={() => {
              localStorage.setItem(ONBOARDING_DONE_KEY, "true");
              setAppState("ready");
            }}
          />
        </div>
        {/* Splash sits above onboarding and fades out — no blank gap */}
        <SplashOverlay visible={splashVisible} />
      </>
    );
  }

  if (appState === "ready") {
    return (
      <>
        {children}
        {/* Splash sits above children and fades out — no blank gap */}
        <SplashOverlay visible={splashVisible} />
      </>
    );
  }

  // appState === "splash" — only the overlay, content not yet determined
  return <SplashOverlay visible={splashVisible} />;
}
