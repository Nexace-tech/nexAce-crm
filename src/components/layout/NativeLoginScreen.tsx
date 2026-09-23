"use client";

import React, { useState } from "react";
import { NativeService } from "@/lib/native/nativeService";

interface NativeLoginScreenProps {
  onReplayOnboarding: () => void;
  /** Called after a successful login so NativeAppGate can transition to the app */
  onLoginSuccess: () => void;
}

/**
 * Full-screen login UI for the native mobile app (Android / iOS).
 * Uses /api/auth/login (JSON response, no redirect) so we can call
 * onLoginSuccess() client-side and let NativeAppGate render the dashboard.
 */
export function NativeLoginScreen({ onReplayOnboarding, onLoginSuccess }: NativeLoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    NativeService.haptic("light");
    setIsPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        NativeService.haptic("success");
        onLoginSuccess();
      } else {
        NativeService.haptic("error");
        setError(data.error || "Login failed. Please try again.");
      }
    } catch {
      NativeService.haptic("error");
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleTogglePassword = () => {
    NativeService.haptic("light");
    setShowPassword((v) => !v);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #f2fbf8 50%, #eafaf6 100%)",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      {/* ── Ambient Glow ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,197,160,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm mx-auto px-6 flex flex-col gap-6 z-10">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, #00c5a0 0%, #008080 100%)",
              boxShadow: "0 8px 24px rgba(0,197,160,0.35)",
            }}
          >
            <i className="fa-solid fa-layer-group text-white text-2xl" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              NexAce{" "}
              <span style={{ color: "#008080" }}>CRM</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Sign in to your workspace
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div
          className="w-full rounded-3xl border border-slate-200/70 shadow-xl p-6 flex flex-col gap-4"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)" }}
        >
          {/* Error message */}
          {error && (
            <div
              className="p-3 text-xs rounded-xl font-medium flex gap-2 items-start"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#dc2626",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <i className="fa-solid fa-circle-xmark mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="na-email"
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <i className="fa-solid fa-envelope text-slate-400" />
                Email Address
              </label>
              <input
                id="na-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all bg-white"
                style={{ WebkitTapHighlightColor: "transparent" }}
                onFocus={(e) => (e.target.style.borderColor = "#00c5a0")}
                onBlur={(e) => (e.target.style.borderColor = "")}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="na-password"
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
              >
                <i className="fa-solid fa-lock text-slate-400" />
                Password
              </label>
              <div className="relative">
                <input
                  id="na-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all bg-white"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  onFocus={(e) => (e.target.style.borderColor = "#00c5a0")}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 mt-1 cursor-pointer"
              style={{
                background: isPending
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #00c5a0 0%, #008080 100%)",
                boxShadow: isPending ? "none" : "0 4px 16px rgba(0,197,160,0.35)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isPending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  Signing In…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Footer links ── */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <p className="text-xs text-slate-500 font-medium text-center leading-relaxed">
            Forgot your password? Contact your workspace administrator or visit the web app to reset it.
          </p>
          <button
            type="button"
            onClick={onReplayOnboarding}
            className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            style={{ color: "#008080", WebkitTapHighlightColor: "transparent" }}
          >
            <i className="fa-solid fa-rotate-left text-[11px]" />
            Replay Tour
          </button>
        </div>
      </div>
    </div>
  );
}
