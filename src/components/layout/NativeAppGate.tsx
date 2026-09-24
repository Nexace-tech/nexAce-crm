"use client";

import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
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
 */
type NativeAppState = "splash" | "onboarding" | "ready";

const ONBOARDING_DONE_KEY = "nexace_native_onboarding_done";
const MIN_SPLASH_MS = 600;

/** Branded full-screen launch splash */
function SplashScreen({ visible }: { visible: boolean }) {
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
        transition: "opacity 0.35s ease",
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
        NexAce{" "}
        <span style={{ color: "#00c5a0" }}>CRM</span>
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

      {/* Subtle pulse loader at bottom */}
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

      {/* Keyframes injected inline — no extra CSS file needed */}
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
  const [isNative] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  });

  const [appState, setAppState] = useState<NativeAppState>("splash");
  // Controls the CSS fade-out of the splash before unmounting
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    if (!isNative) {
      // Web browser — skip gate entirely, no splash needed
      setSplashVisible(false);
      setAppState("ready");
      return;
    }

    const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === "true";

    if (!onboardingDone) {
      // First-ever launch — no session check needed, just wait the min time
      const timer = setTimeout(() => {
        setSplashVisible(false);
        setTimeout(() => setAppState("onboarding"), 350); // after fade-out
      }, MIN_SPLASH_MS);
      return () => clearTimeout(timer);
    }

    // Returning user — check session while splash shows, honour minimum display time
    const sessionCheck = fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .catch(() => ({ user: null }));

    const minDelay = new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_SPLASH_MS)
    );

    Promise.all([sessionCheck, minDelay]).then(() => {
      // Both done — fade out splash then render children
      setSplashVisible(false);
      setTimeout(() => setAppState("ready"), 350); // after fade-out
    });
  }, [isNative]);

  // ── Web: bypass completely ──────────────────────────────────────────────
  if (!isNative) {
    return <>{children}</>;
  }

  // ── Splash ───────────────────────────────────────────────────────────────
  if (appState === "splash") {
    return <SplashScreen visible={splashVisible} />;
  }

  // ── Onboarding ───────────────────────────────────────────────────────────
  if (appState === "onboarding") {
    const handleOnboardingDone = () => {
      localStorage.setItem(ONBOARDING_DONE_KEY, "true");
      setAppState("ready");
    };

    return (
      <div
        className="fixed inset-0 z-[99999] w-full h-full overflow-hidden"
        style={{ background: "#eefbf9" }}
      >
        <OnboardingScreens
          isAppLocked={true}
          isFullScreen={true}
          onDone={handleOnboardingDone}
        />
      </div>
    );
  }

  // ── Ready — standard Next.js app router takes over ───────────────────────
  return <>{children}</>;
}
