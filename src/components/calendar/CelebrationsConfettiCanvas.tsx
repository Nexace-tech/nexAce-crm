"use client";

import React, { useEffect, useRef } from "react";

interface CelebrationsConfettiCanvasProps {
  /** Changing or incrementing triggerKey fires a fresh confetti explosion */
  triggerKey?: string | number | null;
  /** Duration in milliseconds (default: 3800ms) */
  duration?: number;
  className?: string;
  /** Cannon launch mode */
  mode?: "cannon" | "shower" | "mixed";
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: "rect" | "circle" | "ribbon" | "star" | "emoji";
  emoji?: string;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltAngleSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

const FESTIVE_COLORS = [
  "#ec4899", // Vivid Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Sky Blue
  "#10b981", // Emerald
  "#f59e0b", // Gold / Amber
  "#ef4444", // Crimson
  "#06b6d4", // Cyan
  "#a855f7", // Violet
  "#f43f5e", // Rose
  "#eab308", // Sun Gold
];

const FESTIVE_EMOJIS = ["🎉", "✨", "🎂", "🎈", "⭐", "🥂", "🎊"];

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

export function CelebrationsConfettiCanvas({
  triggerKey,
  duration = 3800,
  className = "absolute inset-0 pointer-events-none w-full h-full z-20",
  mode = "cannon",
}: CelebrationsConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!triggerKey) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const setupDimensions = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const w = canvas.offsetWidth || window.innerWidth;
      const h = canvas.offsetHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      return { width: w, height: h };
    };

    let { width, height } = setupDimensions();

    const particles: Particle[] = [];
    const particleCount = width < 640 ? 55 : 95;

    // Spawn dual-cannon burst or top celebratory shower
    for (let i = 0; i < particleCount; i++) {
      const isLeftCannon = i % 2 === 0;
      const isEmoji = i % 11 === 0; // ~9% celebratory emojis
      const shapeRoll = Math.random();
      const shape: Particle["shape"] = isEmoji
        ? "emoji"
        : shapeRoll < 0.35
        ? "ribbon"
        : shapeRoll < 0.6
        ? "rect"
        : shapeRoll < 0.82
        ? "star"
        : "circle";

      let startX: number;
      let startY: number;
      let initialVx: number;
      let initialVy: number;

      if (mode === "cannon" || mode === "mixed") {
        if (isLeftCannon) {
          startX = width * 0.1 + (Math.random() - 0.5) * 40;
          startY = height * 0.85 + (Math.random() - 0.5) * 30;
          initialVx = Math.random() * 7 + 4; // Blast rightwards
          initialVy = -(Math.random() * 8 + 8); // Blast upwards
        } else {
          startX = width * 0.9 + (Math.random() - 0.5) * 40;
          startY = height * 0.85 + (Math.random() - 0.5) * 30;
          initialVx = -(Math.random() * 7 + 4); // Blast leftwards
          initialVy = -(Math.random() * 8 + 8); // Blast upwards
        }
      } else {
        // Shower mode from top
        startX = Math.random() * width;
        startY = Math.random() * (height * 0.3) - 30;
        initialVx = (Math.random() - 0.5) * 4.5;
        initialVy = Math.random() * 3 + 1.5;
      }

      particles.push({
        x: startX,
        y: startY,
        size: isEmoji ? Math.random() * 4 + 14 : Math.random() * 7 + 4,
        color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
        shape,
        emoji: isEmoji ? FESTIVE_EMOJIS[Math.floor(Math.random() * FESTIVE_EMOJIS.length)] : undefined,
        vx: initialVx,
        vy: initialVy,
        gravity: isEmoji ? 0.03 : 0.075 + Math.random() * 0.04,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        tiltAngle: Math.random() * Math.PI,
        tiltAngleSpeed: Math.random() * 0.08 + 0.04,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.06 + 0.03,
        opacity: 1,
      });
    }

    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Apply physics
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.985; // Air drag

        // 3D paper flutter & horizontal wind wobble
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 1.2;
        p.tiltAngle += p.tiltAngleSpeed;
        p.rotation += p.rotationSpeed;

        // Smooth fade out over last 35% of duration
        const fadeThreshold = duration * 0.65;
        if (elapsed > fadeThreshold) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeThreshold) / (duration - fadeThreshold));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;

        if (p.shape === "emoji" && p.emoji) {
          ctx.font = `${p.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.emoji, 0, 0);
        } else if (p.shape === "star") {
          ctx.fillStyle = p.color;
          // Scale star slightly with tilt to shimmer
          const starScale = Math.abs(Math.cos(p.tiltAngle)) * 0.4 + 0.6;
          ctx.scale(starScale, starScale);
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
        } else if (p.shape === "ribbon") {
          ctx.fillStyle = p.color;
          // 3D vertical flutter
          const tiltY = Math.cos(p.tiltAngle);
          ctx.scale(1, tiltY);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * 1.8, p.size * 0.45);
        } else if (p.shape === "circle") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // rect
          ctx.fillStyle = p.color;
          const tiltY = Math.cos(p.tiltAngle);
          ctx.scale(1, tiltY);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        }

        ctx.restore();
      });

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    render();

    const handleResize = () => {
      const dims = setupDimensions();
      width = dims.width;
      height = dims.height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (canvasRef.current) {
        const c = canvasRef.current.getContext("2d");
        if (c) c.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [triggerKey, duration, mode]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
