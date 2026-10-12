"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./HeroDataFlowEngine.module.css";

interface DataSource {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgLight: string;
  badge: string;
  step: string;
  telemetryLog: string;
  deal: {
    company: string;
    amount: string;
    time: string;
  };
}

const DATA_SOURCES: DataSource[] = [
  {
    id: "web",
    name: "Website Forms",
    icon: "fa-solid fa-globe",
    color: "#00c5a0",
    bgLight: "rgba(0, 197, 160, 0.12)",
    badge: "+34 leads",
    step: "AI Lead Scoring (99.4%) · Routing to Senior AE",
    telemetryLog: "Lead scored 99.4% · Auto-dispatched enterprise intake packet",
    deal: {
      company: "Starlight Dynamics",
      amount: "+$74,500 ARR",
      time: "2m ago",
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn Inbound",
    icon: "fa-brands fa-linkedin",
    color: "#06b6d4",
    bgLight: "rgba(6, 182, 212, 0.12)",
    badge: "High Intent",
    step: "Firmographic Enrichment · Opportunity Created",
    telemetryLog: "Buyer intent signal verified · Territory opportunity matched",
    deal: {
      company: "Apex Global Cloud",
      amount: "+$52,000 ARR",
      time: "Just now",
    },
  },
  {
    id: "email",
    name: "Email & Threads",
    icon: "fa-solid fa-envelope",
    color: "#f59e0b",
    bgLight: "rgba(245, 158, 11, 0.12)",
    badge: "Synced",
    step: "Sentiment Positive · Proposal Draft Dispatched",
    telemetryLog: "Inbound email parsed · Automated calendar sequence booked",
    deal: {
      company: "BioHealth Diagnostics",
      amount: "+$38,000 ARR",
      time: "4m ago",
    },
  },
  {
    id: "stripe",
    name: "Stripe Billing",
    icon: "fa-solid fa-bolt",
    color: "#10b981",
    bgLight: "rgba(16, 185, 129, 0.12)",
    badge: "Real-time",
    step: "Payment Cleared · Auto-Provisioning Workspace",
    telemetryLog: "Enterprise subscription activated · Workspace provisioned in 3.2s",
    deal: {
      company: "Hyperion Logistics",
      amount: "+$89,200 ARR",
      time: "1m ago",
    },
  },
];

export function HeroDataFlowEngine() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-cycle through data sources smoothly
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % DATA_SOURCES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPaused]);

  const current = DATA_SOURCES[activeIdx];

  return (
    <div
      className={styles.flowContainer}
      style={{ "--active-color": current.color } as React.CSSProperties}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.ambientGlow} aria-hidden />

      {/* ── Minimal Top Status Bar ── */}
      <div className={styles.flowTopBar}>
        <div className={styles.flowTagline}>
          <i className={`fa-solid fa-network-wired ${styles.taglineIcon}`} />
          <span>Multi-Channel Ingestion &rarr; NexAce CRM &rarr; Gained Sales</span>
        </div>

        <div className={styles.flowLiveBadge}>
          <span className={styles.liveDot} />
          <span>Live Ingestion Engine</span>
        </div>
      </div>

      {/* ── 3-Column Stream Grid ── */}
      <div className={styles.flowGrid}>
        {/* ── STAGE 1: Minimalist Sources (Left) ── */}
        <div className={styles.sourcesList}>
          {DATA_SOURCES.map((src, idx) => {
            const isActive = idx === activeIdx;
            return (
              <motion.div
                key={src.id}
                className={`${styles.sourcePill} ${isActive ? styles.sourcePillActive : ""}`}
                onClick={() => setActiveIdx(idx)}
                whileTap={{ scale: 0.98 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActiveIdx(idx);
                }}
              >
                <div className={styles.sourceLeft}>
                  <div
                    className={styles.sourceIcon}
                    style={{ background: src.bgLight, color: src.color }}
                  >
                    <i className={src.icon} />
                  </div>
                  <span className={styles.sourceName}>{src.name}</span>
                </div>

                <span
                  className={styles.sourceBadge}
                  style={{ background: src.bgLight, color: src.color }}
                >
                  {src.badge}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ── STAGE 2: Central NexAce CRM Core (Center) ── */}
        <div className={styles.hubCenter}>
          <div className={styles.beamIn} aria-hidden>
            <i className="fa-solid fa-angles-right" />
          </div>

          <div className={styles.hubBox}>
            <div className={styles.hubRadarRing} aria-hidden />

            <div className={styles.hubHeader}>
              <div className={styles.hubIcon}>
                <i className="fa-solid fa-bolt" />
              </div>
              <div className={styles.hubTitleGroup}>
                <h4 className={styles.hubTitle}>NexAce CRM Core</h4>
                <span className={styles.hubSubtitle}>
                  <i className="fa-solid fa-sparkles" /> Compiling &amp; Enriching
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                className={styles.hubStepBanner}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
              >
                <i className={`fa-solid fa-arrows-rotate ${styles.stepIconSpin}`} />
                <span>{current.step}</span>
              </motion.div>
            </AnimatePresence>

            <div className={styles.hubStatsRow}>
              <span>Signals: <strong>2,480/s</strong></span>
              <span>Latency: <strong>&lt;14ms</strong></span>
              <span>Deduplication: <strong style={{ color: "#10b981" }}>100%</strong></span>
            </div>
          </div>

          <div className={styles.beamOut} aria-hidden>
            <i className="fa-solid fa-angles-right" />
          </div>
        </div>

        {/* ── STAGE 3: Gained Sales Outcome (Right) ── */}
        <div className={styles.salesColumn}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className={styles.dealCard}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.24 }}
            >
              <div className={styles.dealCardTop}>
                <span className={styles.dealBadge}>
                  <i className="fa-solid fa-trophy" /> Deal Won
                </span>
                <span className={styles.dealTime}>
                  <i className="fa-solid fa-clock" /> {current.deal.time}
                </span>
              </div>

              <div className={styles.dealCardBottom}>
                <span className={styles.dealCompany}>{current.deal.company}</span>
                <span className={styles.dealAmount}>{current.deal.amount}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className={styles.miniMetricBar}>
            <span>Win Rate Acceleration</span>
            <span className={styles.metricValue}>
              <i className="fa-solid fa-arrow-trend-up" /> +42.6%
            </span>
          </div>

          <div className={styles.miniMetricBar}>
            <span>Pipeline Velocity</span>
            <span className={styles.metricValue}>
              <i className="fa-solid fa-bolt" /> 3.4x Faster
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Telemetry Micro-Ticker Bar (Bottom) ── */}
      <div className={styles.telemetryBar}>
        <div className={styles.telemetryLeft}>
          <i className="fa-solid fa-terminal" />
          <AnimatePresence mode="wait">
            <motion.span
              key={current.id}
              className={styles.telemetryLog}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25 }}
            >
              {current.telemetryLog}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className={styles.telemetryStats}>99.99% Uptime</span>
      </div>
    </div>
  );
}
