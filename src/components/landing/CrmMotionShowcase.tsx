"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./CrmMotionShowcase.module.css";

const TABS = [
  { id: "deals", label: "Deals Pipeline", icon: "fa-handshake" },
  { id: "sprint", label: "Sprint Kanban", icon: "fa-folder-tree" },
  { id: "hr", label: "Timesheets & HR", icon: "fa-user-clock" },
  { id: "pulse", label: "Activity Stream", icon: "fa-bolt" },
];

const tabMotionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
};

export function CrmMotionShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [leaveApproved, setLeaveApproved] = useState(false);
  const [clockSeconds, setClockSeconds] = useState(42);

  // Auto-cycle through tabs every 6 seconds unless hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % TABS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Live ticking seconds for punch clock
  useEffect(() => {
    const timer = setInterval(() => {
      setClockSeconds((prev) => (prev >= 59 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={styles.showcaseWrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Subtle Ambient Backlight Glow */}
      <div className={styles.ambientBacklight} aria-hidden />



      {/* Main Mockup Window Container */}
      <div className={styles.windowContainer}>
        {/* Minimal macOS Top Titlebar */}
        <div className={styles.windowBar}>
          <div className={styles.windowControls}>
            <span className={`${styles.trafficDot} ${styles.dotRed}`} />
            <span className={`${styles.trafficDot} ${styles.dotYellow}`} />
            <span className={`${styles.trafficDot} ${styles.dotGreen}`} />
          </div>

          <div className={styles.windowTitleCenter}>
            <i className="fa-solid fa-layer-group" />
            <span>Apex Technologies Workspace · NexAce CRM</span>
          </div>

          <div className={styles.windowStatusRight}>
            <span className={styles.statusDotPulse} />
            <span>Operational</span>
          </div>
        </div>

        {/* Minimal Segmented Tabs */}
        <div className={styles.tabsNav}>
          {TABS.map((tab, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
              >
                <i className={`fa-solid ${tab.icon}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="minimalTabIndicator"
                    className={styles.tabProgressBar}
                    transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Viewport */}
        <div className={styles.viewport}>
          <AnimatePresence mode="wait">
            {/* VIEW 0: Deals & Pipeline */}
            {activeTab === 0 && (
              <motion.div
                key="tab-deals"
                {...tabMotionProps}
                className={styles.dealsContainer}
              >
                {/* Clean Top Stat Strip */}
                <div className={styles.statRowStrip}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Target MRR</span>
                    <span className={styles.statValue}>$350,000</span>
                    <span className={styles.statSub}>92% Achieved</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Active Pipeline</span>
                    <span className={styles.statValue}>18 Deals</span>
                    <span className={styles.statSub}>$286k In Flight</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Avg. Sales Cycle</span>
                    <span className={styles.statValue}>14 Days</span>
                    <span className={styles.statSub}>3.2x Industry Standard</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Won This Month</span>
                    <span className={styles.statValue} style={{ color: "#00c5a0" }}>$128,500</span>
                    <span className={styles.statSub}>+24% vs Target</span>
                  </div>
                </div>

                {/* 3 Pipeline Stages */}
                <div className={styles.pipelineGrid}>
                  {/* Stage 1: Qualified */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>Qualified</span>
                      <span className={styles.colCount}>3</span>
                    </div>
                    <div className={styles.dealCard}>
                      <div className={styles.dealTopRow}>
                        <span className={styles.dealCompany}>Nexus Robotics</span>
                        <span className={styles.dealAmount}>$32,000</span>
                      </div>
                      <div className={styles.dealBottomRow}>
                        <span className={styles.tagPill}>Enterprise</span>
                        <span>Stage 1 · 80% Prob</span>
                      </div>
                    </div>
                    <div className={styles.dealCard}>
                      <div className={styles.dealTopRow}>
                        <span className={styles.dealCompany}>OmniPay Fintech</span>
                        <span className={styles.dealAmount}>$18,500</span>
                      </div>
                      <div className={styles.dealBottomRow}>
                        <span className={styles.tagPill}>Growth</span>
                        <span>Discovery Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 2: Proposal Sent */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>Proposal Sent</span>
                      <span className={styles.colCount}>2</span>
                    </div>
                    <div className={styles.dealCard}>
                      <div className={styles.dealTopRow}>
                        <span className={styles.dealCompany}>Starlight Media</span>
                        <span className={styles.dealAmount}>$44,000</span>
                      </div>
                      <div className={styles.dealBottomRow}>
                        <span className={styles.tagPill}>Retainer</span>
                        <span>Legal Review</span>
                      </div>
                    </div>
                    <div className={styles.dealCard}>
                      <div className={styles.dealTopRow}>
                        <span className={styles.dealCompany}>Apex Global Migration</span>
                        <span className={styles.dealAmount}>$48,500</span>
                      </div>
                      <div className={styles.dealBottomRow}>
                        <span className={styles.tagPill}>Multi-Tenant</span>
                        <span>Final Sign-Off</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3: Closed Won */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>Closed Won</span>
                      <span className={styles.colCount}>4</span>
                    </div>
                    <div className={styles.dealCard} style={{ borderColor: "rgba(0, 197, 160, 0.4)" }}>
                      <div className={styles.dealTopRow}>
                        <span className={styles.dealCompany}>Vanguard Logistics</span>
                        <span className={styles.dealAmount} style={{ color: "#00c5a0" }}>$64,000</span>
                      </div>
                      <div className={styles.dealBottomRow}>
                        <span className={styles.wonTag}>
                          <i className="fa-solid fa-check" style={{ marginRight: "0.25rem" }} /> Signed Today
                        </span>
                        <span>Annual Tier</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 1: Sprint Kanban */}
            {activeTab === 1 && (
              <motion.div
                key="tab-sprint"
                {...tabMotionProps}
                className={styles.sprintContainer}
              >
                <div className={styles.sprintBarTop}>
                  <div className={styles.sprintMetaGroup}>
                    <i className="fa-solid fa-code-branch" style={{ color: "#00c5a0" }} />
                    <div>
                      <div className={styles.sprintMetaTitle}>Sprint 14: Core Architecture</div>
                      <div className={styles.sprintMetaSub}>Target Oct 18 · 14 of 16 Issues Completed</div>
                    </div>
                  </div>

                  <div className={styles.sprintProgressGroup}>
                    <div className={styles.trackBar}>
                      <div className={styles.fillBar} style={{ width: "88%" }} />
                    </div>
                    <span className={styles.percentLabel}>88%</span>
                  </div>
                </div>

                <div className={styles.sprintGrid}>
                  {/* Column 1: In Progress */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>In Progress</span>
                      <span className={styles.colCount}>2</span>
                    </div>
                    <div className={styles.taskItem}>
                      <div className={styles.taskTitle}>RBAC Role Isolation & Data Encryption</div>
                      <div className={styles.taskMetaRow}>
                        <span className={styles.priorityDot}>
                          <span className={styles.dotRedSmall} /> High Priority
                        </span>
                        <span className={styles.assigneeBadge}>Sarah K.</span>
                      </div>
                    </div>
                    <div className={styles.taskItem}>
                      <div className={styles.taskTitle}>Timesheet Batch Approval Endpoint</div>
                      <div className={styles.taskMetaRow}>
                        <span className={styles.priorityDot}>
                          <span className={styles.dotAmberSmall} /> Feature
                        </span>
                        <span className={styles.assigneeBadge}>David L.</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: In Review */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>In Review</span>
                      <span className={styles.colCount}>1</span>
                    </div>
                    <div className={styles.taskItem}>
                      <div className={styles.taskTitle}>Calendar Leave Sync with Google & Outlook</div>
                      <div className={styles.taskMetaRow}>
                        <span className={styles.priorityDot}>
                          <span className={styles.dotAmberSmall} /> Ready for QA
                        </span>
                        <span className={styles.assigneeBadge}>Maya R.</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Done */}
                  <div className={styles.pipelineCol}>
                    <div className={styles.colHeader}>
                      <span>Completed</span>
                      <span className={styles.colCount}>14</span>
                    </div>
                    <div className={styles.taskItem}>
                      <div className={styles.taskTitle}>Automated Temporary Password & Email Sender</div>
                      <div className={styles.taskMetaRow}>
                        <span className={styles.priorityDot}>
                          <span className={styles.dotGreenSmall} /> Verified
                        </span>
                        <span style={{ color: "#00c5a0", fontWeight: 600, fontSize: "0.68rem" }}>Deployed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: Timesheets & HR */}
            {activeTab === 2 && (
              <motion.div
                key="tab-hr"
                {...tabMotionProps}
                className={styles.hrLayout}
              >
                {/* Punch Clock Box */}
                <div className={styles.hrPanel}>
                  <div className={styles.panelHeader}>
                    <span>
                      <i className="fa-solid fa-stopwatch" />
                      Employee Time Clock
                    </span>
                    <span style={{ color: "#00c5a0", fontSize: "0.72rem", fontWeight: 600 }}>● Active Shift</span>
                  </div>

                  <div className={styles.timerDisplayBox}>
                    <span className={styles.timerDigits}>
                      06:42:{clockSeconds < 10 ? `0${clockSeconds}` : clockSeconds}
                    </span>
                    <span className={styles.timerUnit}>HRS TODAY</span>
                  </div>

                  <div className={styles.shiftInfoStrip}>
                    <div className={styles.shiftInfoItem}>
                      <span className={styles.shiftInfoLabel}>Clock-In</span>
                      <span className={styles.shiftInfoVal}>09:15 AM</span>
                    </div>
                    <div className={styles.shiftInfoItem}>
                      <span className={styles.shiftInfoLabel}>Weekly Total</span>
                      <span className={styles.shiftInfoVal} style={{ color: "#00c5a0" }}>
                        38.5 / 40.0h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manager Approvals Box */}
                <div className={styles.hrPanel}>
                  <div className={styles.panelHeader}>
                    <span>
                      <i className="fa-solid fa-user-check" />
                      Pending Approval
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.72rem" }}>1 Pending</span>
                  </div>

                  <div className={styles.approvalRow}>
                    <div className={styles.approvalLeft}>
                      <span className={styles.avatarCircle}>AM</span>
                      <div className={styles.approvalText}>
                        <span className={styles.empName}>Alex Morgan</span>
                        <span className={styles.leaveDetails}>Paid Time Off · 3 Days (Dec 18 - 20)</span>
                      </div>
                    </div>

                    {leaveApproved ? (
                      <span className={styles.approvedBadge}>
                        <i className="fa-solid fa-check" /> Approved
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLeaveApproved(true)}
                        className={styles.approveButton}
                      >
                        <i className="fa-solid fa-check" /> Approve
                      </button>
                    )}
                  </div>

                  <div className={styles.shiftInfoStrip} style={{ marginTop: "auto" }}>
                    <div className={styles.shiftInfoItem}>
                      <span className={styles.shiftInfoLabel}>Active Team Online</span>
                      <span className={styles.shiftInfoVal} style={{ color: "#00c5a0" }}>48 Present</span>
                    </div>
                    <div className={styles.shiftInfoItem}>
                      <span className={styles.shiftInfoLabel}>Scheduled Leave</span>
                      <span className={styles.shiftInfoVal}>3 Members</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: Activity Stream */}
            {activeTab === 3 && (
              <motion.div
                key="tab-pulse"
                {...tabMotionProps}
                className={styles.feedLayout}
              >
                <div className={styles.feedCardBox}>
                  <div className={styles.streamItem}>
                    <div className={styles.streamLeft}>
                      <div className={styles.streamIconDot}>
                        <i className="fa-solid fa-handshake" style={{ color: "#00c5a0" }} />
                      </div>
                      <div className={styles.streamContent}>
                        <span className={styles.streamTitle}>Deal Won: Apex Global ($48,500 MRR)</span>
                        <span className={styles.streamSub}>Signed by Enterprise Sales team</span>
                      </div>
                    </div>
                    <span className={styles.streamTime}>Just now</span>
                  </div>

                  <div className={styles.streamItem}>
                    <div className={styles.streamLeft}>
                      <div className={styles.streamIconDot}>
                        <i className="fa-solid fa-circle-check" style={{ color: "#06b6d4" }} />
                      </div>
                      <div className={styles.streamContent}>
                        <span className={styles.streamTitle}>Sprint 14 Burndown Velocity on Track</span>
                        <span className={styles.streamSub}>14 of 16 issues verified by QA</span>
                      </div>
                    </div>
                    <span className={styles.streamTime}>15m ago</span>
                  </div>

                  <div className={styles.streamItem}>
                    <div className={styles.streamLeft}>
                      <div className={styles.streamIconDot}>
                        <i className="fa-solid fa-clock" style={{ color: "#10b981" }} />
                      </div>
                      <div className={styles.streamContent}>
                        <span className={styles.streamTitle}>Weekly Timesheet Batch Validated</span>
                        <span className={styles.streamSub}>12 engineering members signed off</span>
                      </div>
                    </div>
                    <span className={styles.streamTime}>1h ago</span>
                  </div>

                  <div className={styles.streamItem}>
                    <div className={styles.streamLeft}>
                      <div className={styles.streamIconDot}>
                        <i className="fa-solid fa-shield-halved" style={{ color: "#f59e0b" }} />
                      </div>
                      <div className={styles.streamContent}>
                        <span className={styles.streamTitle}>SOC2 Multi-Tenant Data Isolation Audit Passed</span>
                        <span className={styles.streamSub}>Automated encryption checks green</span>
                      </div>
                    </div>
                    <span className={styles.streamTime}>3h ago</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
