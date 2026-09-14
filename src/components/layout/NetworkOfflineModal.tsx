"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

/**
 * Enhanced Production-Grade Network Offline Modal & Notification Banner.
 * Strictly uses FontAwesome 6 icons and delivers a premium mobile & web experience.
 */
export function NetworkOfflineModal() {
  const { isOnline, reconnected, isChecking, isNative, checkConnection } = useNetworkStatus();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(8);

  const handleRetry = useCallback(async (isAuto = false) => {
    if (!isAuto) setFeedbackMsg("Verifying internet throughput...");
    const success = await checkConnection();
    if (success) {
      setFeedbackMsg("Connected! Refreshing workspace...");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setFeedbackMsg("Still offline. Please check your network.");
      setCountdown(8);
    }
  }, [checkConnection]);

  // Periodic automatic reconnection attempts
  useEffect(() => {
    if (isOnline) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRetry(true);
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOnline, handleRetry]);

  if (isOnline && !reconnected) return null;

  return (
    <>
      {/* ── Floating Notification Bar ── */}
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-xl",
          !isOnline
            ? "bg-rose-600 text-white animate-pulse"
            : "bg-emerald-600 text-white"
        )}
        style={{
          paddingTop: "max(0.6rem, env(safe-area-inset-top, 0px))",
        }}
      >
        {!isOnline ? (
          <>
            <i className="fa-solid fa-triangle-exclamation text-sm" />
            <span>You are currently offline. Changes will sync once reconnected.</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-circle-check text-sm" />
            <span>Connection restored! You are back online.</span>
          </>
        )}
      </div>

      {/* ── Mobile App / Viewport Modal Overlay ── */}
      {!isOnline && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-heading"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-5 select-none animate-in fade-in duration-300"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="w-full max-w-sm rounded-[28px] bg-[#161c24]/95 border border-white/10 p-7 text-center shadow-2xl flex flex-col items-center relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-44 h-44 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Radar Pulse Badge */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl border border-rose-500/40 animate-ping opacity-75" />
              <div className="w-20 h-20 rounded-3xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center shadow-lg shadow-rose-500/20 relative z-10">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-[#161c24] flex items-center justify-center text-rose-400 text-xs shadow z-20">
                <i className="fa-solid fa-wifi" />
              </div>
            </div>

            {/* Title & Description */}
            <h2 id="offline-heading" className="text-xl font-extrabold text-white tracking-tight mb-2">
              No Internet Connection
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 px-2">
              NexAce CRM requires an active internet connection to communicate with your workspace.
            </p>

            {/* Diagnostics Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 mb-5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Offline Mode • Auto-retrying in {countdown}s</span>
            </div>

            {/* Retry Button */}
            <button
              type="button"
              onClick={() => handleRetry(false)}
              disabled={isChecking}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#00c5a0] to-[#0ea5e9] text-slate-950 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#00c5a0]/30 disabled:opacity-50 cursor-pointer"
            >
              {isChecking ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                  <span>Checking Connection...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrows-rotate text-sm" />
                  <span>Retry Connection Now</span>
                </>
              )}
            </button>

            {/* Feedback Message */}
            {feedbackMsg && (
              <p
                className={cn(
                  "text-xs font-semibold mt-3 transition-all",
                  feedbackMsg.includes("Connected") ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {feedbackMsg}
              </p>
            )}

            {/* Troubleshooting Suggestions Toggle */}
            <button
              type="button"
              onClick={() => setShowTips((prev) => !prev)}
              className="w-full mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-x-0 border-b-0"
            >
              <span>Troubleshooting tips</span>
              <i className={cn("fa-solid fa-chevron-down text-[10px] transition-transform duration-200", showTips && "rotate-180")} />
            </button>

            {/* Collapsible Tips List */}
            {showTips && (
              <div className="w-full text-left mt-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c5a0] shrink-0" />
                  <span>Check Wi-Fi or cellular data switches</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c5a0] shrink-0" />
                  <span>Toggle Airplane mode on and off</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c5a0] shrink-0" />
                  <span>Restart or force close the application</span>
                </div>
              </div>
            )}

            {/* Device Footer Badge */}
            {isNative && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
                <i className="fa-solid fa-mobile-screen text-[10px]" />
                <span>NexAce Mobile Workspace</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
