"use client";

import React, { useState, useEffect, useRef } from "react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Confetti Particle Explosion
  useEffect(() => {
    if (dismissed || (!isMyBirthday && !isMyAnniversary)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const colors = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.4,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }));

    let startTime = Date.now();
    const duration = 4000; // 4 seconds confetti burst

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (elapsed > 2500) {
          p.opacity = Math.max(0, 1 - (elapsed - 2500) / 1500);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.width = canvasRef.current.offsetWidth;
      height = canvasRef.current.height = canvasRef.current.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [dismissed, isMyBirthday, isMyAnniversary]);

  if (dismissed || (!isMyBirthday && !isMyAnniversary)) return null;

  // Personalized Headline
  let headline = `Happy Birthday, ${userName}! 🎉`;
  let subtext = "The entire team is celebrating you today! Wishing you a fantastic year full of happiness, health, and big wins!";
  let badgeLabel = "Birthday Celebration";
  let iconClass = "fa-cake-candles";

  if (isMyBirthday && isMyAnniversary) {
    headline = `Double Celebration, ${userName}! 🎂🏆`;
    subtext = `Happy Birthday and Happy Work Anniversary (${milestoneText || "Special Milestone"})! Thank you for being such an extraordinary part of our team!`;
    badgeLabel = "Dual Celebration Milestone";
    iconClass = "fa-champagne-glasses";
  } else if (isMyAnniversary) {
    headline = `Happy Work Anniversary, ${userName}! 🏆`;
    subtext = `Celebrating your ${milestoneText || "Work Anniversary"}! Thank you for your dedication, brilliance, and tremendous contributions to our journey!`;
    badgeLabel = milestoneText || "Work Anniversary";
    iconClass = "fa-award";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-4 sm:p-5 shadow-sm transition-all mb-5">
      {/* Confetti Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full"
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Avatar & Message */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-md shrink-0 animate-bounce duration-1000">
            <i className={`fa-solid ${iconClass}`} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                {badgeLabel}
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                Today is your special day! ✨
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-foreground mt-1">
              {headline}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              {subtext}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            onClick={onOpenWishes}
            className="flex-1 md:flex-initial min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <i className="fa-solid fa-envelope-open-text text-sm" />
            <span>View Wishes ({wishesCount})</span>
          </button>

          <button
            type="button"
            onClick={onThankEveryone}
            className="flex-1 md:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <i className="fa-solid fa-heart text-sm" />
            <span>Thank Everyone ❤️</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            title="Dismiss banner"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
