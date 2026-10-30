"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./page.module.css";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CrmMotionShowcase } from "@/components/landing/CrmMotionShowcase";
import { HeroDataFlowEngine } from "@/components/landing/HeroDataFlowEngine";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ name: string; role?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Prevent background scroll and allow ESC key closing when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  return (
    <div className={styles.container}>

      {/* ── Ambient Background Orbs ── */}
      <div className={styles.orb1} aria-hidden />
      <div className={styles.orb2} aria-hidden />
      <div className={styles.orb3} aria-hidden />

      {/* ── Sticky Navigation ── */}
      <header className={styles.header}>
        <div className={styles.logoSection}>
          <span className={styles.logoIcon}>
            <i className="fa-solid fa-layer-group" />
          </span>
          <span className={styles.logoText}>NexAce <span className={styles.logoCRM}>CRM</span></span>
        </div>
        <nav className={styles.nav}>
          {/* Desktop Navigation Links */}
          <div className={styles.desktopNavGroup}>
            <ThemeToggle />
            <Link href="/guide" className={styles.navLink}>
              <i className="fa-solid fa-book-open" /> User Guide
            </Link>
            {currentUser ? (
              <>
                <span className={styles.userBadge} title={currentUser.name}>
                  <i className="fa-solid fa-circle-user" />
                  <span className={styles.userBadgeText}>{currentUser.name}</span>
                </span>
                <Link href="/dashboard" className={styles.btnPrimary}>
                  <i className="fa-solid fa-gauge-high" /> Enter Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.navLink}>
                  <i className="fa-solid fa-right-to-bracket" /> Sign In
                </Link>
                <Link href="/dashboard" className={styles.btnPrimary}>
                  <i className="fa-solid fa-rocket" /> Enter Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation Header Controls (Theme & Menu Toggle) */}
          <div className={styles.mobileNavHeaderGroup}>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={styles.menuToggleBtn}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              title="Toggle Navigation Menu"
            >
              <i className={mobileMenuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Navigation Dropdown Drawer ── */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerScrollable}>
              {/* Primary Action Hero Card */}
              <Link
                href="/dashboard"
                className={styles.mobilePrimaryCta}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className={styles.mobilePrimaryCtaLeft}>
                  <div className={styles.mobilePrimaryCtaIcon}>
                    <i className="fa-solid fa-gauge-high" />
                  </div>
                  <div className={styles.mobilePrimaryCtaText}>
                    <span className={styles.mobilePrimaryCtaTitle}>Enter Dashboard</span>
                    <span className={styles.mobilePrimaryCtaSubtitle}>
                      {currentUser ? "Continue active workspace session" : "Launch demo & executive view"}
                    </span>
                  </div>
                </div>
                <div className={styles.mobilePrimaryCtaArrow}>
                  <i className="fa-solid fa-arrow-right" />
                </div>
              </Link>

              {/* Navigation Menu Section */}
              <div className={styles.mobileNavSection}>
                <div className={styles.mobileNavSectionHeader}>Navigation & Resources</div>
                <div className={styles.mobileNavList}>
                  <Link
                    href="/guide"
                    className={styles.mobileNavItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.mobileNavItemLeft}>
                      <span className={`${styles.mobileNavIconWrap} ${styles.iconGuide}`}>
                        <i className="fa-solid fa-book-open" />
                      </span>
                      <div className={styles.mobileNavItemText}>
                        <span className={styles.mobileNavItemLabel}>User Guide & Documentation</span>
                        <span className={styles.mobileNavItemDesc}>Workflows, keyboard shortcuts & tips</span>
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-right ${styles.mobileNavChevron}`} />
                  </Link>

                  <Link
                    href="/register"
                    className={styles.mobileNavItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.mobileNavItemLeft}>
                      <span className={`${styles.mobileNavIconWrap} ${styles.iconRegister}`}>
                        <i className="fa-solid fa-building-user" />
                      </span>
                      <div className={styles.mobileNavItemText}>
                        <span className={styles.mobileNavItemLabel}>Register Workspace</span>
                        <span className={styles.mobileNavItemDesc}>Set up new company or department</span>
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-right ${styles.mobileNavChevron}`} />
                  </Link>

                  {!currentUser && (
                    <Link
                      href="/login"
                      className={styles.mobileNavItem}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className={styles.mobileNavItemLeft}>
                        <span className={`${styles.mobileNavIconWrap} ${styles.iconLogin}`}>
                          <i className="fa-solid fa-right-to-bracket" />
                        </span>
                        <div className={styles.mobileNavItemText}>
                          <span className={styles.mobileNavItemLabel}>Sign In</span>
                          <span className={styles.mobileNavItemDesc}>Access your existing account</span>
                        </div>
                      </div>
                      <i className={`fa-solid fa-chevron-right ${styles.mobileNavChevron}`} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Quick Metrics Trust Bar */}
              <div className={styles.mobileTrustStrip}>
                <div className={styles.mobileTrustPill}>
                  <i className="fa-solid fa-users" />
                  <span>10k+ Managed</span>
                </div>
                <div className={styles.mobileTrustPill}>
                  <i className="fa-solid fa-layer-group" />
                  <span>500+ Orgs</span>
                </div>
                <div className={styles.mobileTrustPill}>
                  <i className="fa-solid fa-star" />
                  <span>4.9 / 5 Rating</span>
                </div>
              </div>
            </div>

            {/* Bottom Docked Profile & System Status */}
            <div className={styles.mobileDrawerBottom}>
              {currentUser && (
                <div className={styles.mobileUserDock}>
                  <div className={styles.mobileUserDockAvatar}>
                    <i className="fa-solid fa-circle-user" />
                  </div>
                  <div className={styles.mobileUserDockInfo}>
                    <div className={styles.mobileUserDockName}>{currentUser.name}</div>
                    <div className={styles.mobileUserDockMeta}>
                      <span className={styles.statusDot} />
                      <span>Online</span>
                      <span className={styles.metaDivider}>·</span>
                      <span className={styles.roleTag}>{currentUser.role || "Member"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                      setCurrentUser(null);
                      setMobileMenuOpen(false);
                      window.location.reload();
                    }}
                    className={styles.mobileLogoutLink}
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket" />
                    <span>Logout</span>
                  </button>
                </div>
              )}

              <div className={styles.mobileDrawerFooterBar}>
                <div className={styles.mobileFooterBrand}>
                  <i className="fa-solid fa-layer-group" />
                  <span>NexAce CRM Enterprise</span>
                </div>
                <div className={styles.mobileFooterStatus}>
                  <span className={styles.footerStatusDot} />
                  <span>Cloud Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <main className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Enterprise-Grade · Multi-Tenant · SaaS
        </div>

        <h1 className={styles.title}>
          The Unified Workspace<br />
          <span className={styles.titleHighlight}>Built for Scale</span>
        </h1>

        <p className={styles.subtitle}>
          One platform to run your entire company — sprints, OKRs, HR workflows,
          client relationships, and team communications without the tool sprawl.
        </p>

        {/* ── Animated Universal Flow Engine: Inbound Sources -> NexAce CRM -> Gaining Sales ── */}
        <HeroDataFlowEngine />

        <div className={styles.ctaGroup}>
          <Link href="/dashboard" className={styles.btnHero}>
            <i className="fa-solid fa-bolt" /> Get Started Free
          </Link>
          <Link href="/guide" className={styles.btnGhost}>
            <i className="fa-solid fa-book-bookmark" /> Explore Feature Guide
          </Link>
        </div>

        {/* ── Minimal Trust Stats Bar ── */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <i className="fa-solid fa-users" />
            <strong>10k+</strong>
            <span>Employees Managed</span>
          </div>
          <span className={styles.statDivider} />
          <div className={styles.statItem}>
            <i className="fa-solid fa-layer-group" />
            <strong>500+</strong>
            <span>Active Workspaces</span>
          </div>
          <span className={styles.statDivider} />
          <div className={styles.statItem}>
            <i className="fa-solid fa-star" />
            <strong>4.9 / 5</strong>
            <span>Rating</span>
          </div>
        </div>
      </main>

      {/* ── Interactive CRM Live Motion Showcase ── */}
      <section className={styles.showcaseSection}>
        <div className={styles.showcaseBadge}>
          <span className={styles.showcaseBadgeDot} />
          <i className="fa-solid fa-desktop" /> Interactive Workspace Tour
        </div>

        <h2 className={styles.sectionTitle}>
          Experience the Platform <span className={styles.titleHighlight}>in Action</span>
        </h2>

        <p className={styles.sectionSubtitle}>
          Toggle across live pipeline stages, agile sprint tracking, timesheets, and real-time team collaboration.
        </p>

        {/* Quick Module Tags */}
        <div className={styles.showcaseModulesPills}>
          <div className={styles.moduleChip}>
            <i className="fa-solid fa-handshake" /> Deals Pipeline
          </div>
          <div className={styles.moduleChip}>
            <i className="fa-solid fa-folder-tree" /> Sprint Kanban
          </div>
          <div className={styles.moduleChip}>
            <i className="fa-solid fa-user-clock" /> Timesheets &amp; HR
          </div>
          <div className={styles.moduleChip}>
            <i className="fa-solid fa-bolt" /> Activity Stream
          </div>
        </div>

        <CrmMotionShowcase />
      </section>

      {/* ── Feature Cards ── */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionLabel}>
          <i className="fa-solid fa-wand-magic-sparkles" /> What&apos;s Inside
        </div>
        <h2 className={styles.sectionTitle}>Everything Your Team Needs</h2>
        <p className={styles.sectionSubtitle}>
          Powerful modules that actually talk to each other — no integrations required.
        </p>

        <div className={styles.grid}>
          {[
            {
              icon: "fa-chart-line",
              color: "#00c5a0",
              glow: "rgba(0,197,160,0.18)",
              title: "Goals & Analytics",
              desc: "Distinct OKRs and KPIs per team. Executive dashboards, trend charts, and automated performance alerts.",
            },
            {
              icon: "fa-folder-tree",
              color: "#06b6d4",
              glow: "rgba(6,182,212,0.18)",
              title: "Sprint & Projects",
              desc: "Kanban boards, Gantt timelines, resource allocation, real-time wiki, and embedded Drive storage.",
            },
            {
              icon: "fa-users",
              color: "#10b981",
              glow: "rgba(16,185,129,0.18)",
              title: "HR & Operations",
              desc: "Onboarding checklists, probation reviews, timesheets, leave approvals, and document vaulting.",
            },
            {
              icon: "fa-handshake",
              color: "#f59e0b",
              glow: "rgba(245,158,11,0.18)",
              title: "CRM & Clients",
              desc: "Pipeline management, deal tracking, contact histories, and referral programs built right in.",
            },
            {
              icon: "fa-comments",
              color: "#ec4899",
              glow: "rgba(236,72,153,0.18)",
              title: "Team Chat",
              desc: "Threaded channels, direct messages, @mentions, and file sharing — fully integrated with tasks.",
            },
            {
              icon: "fa-shield-halved",
              color: "#8b5cf6",
              glow: "rgba(139,92,246,0.18)",
              title: "Roles & Security",
              desc: "Fine-grained RBAC, SSO support, audit logs, and per-workspace data isolation.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={styles.card}
              style={{ "--card-glow": f.glow } as React.CSSProperties}
            >
              <div className={styles.cardIconWrap} style={{ background: f.glow }}>
                <i className={`fa-solid ${f.icon}`} style={{ color: f.color }} />
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
              <div className={styles.cardAccent} style={{ background: f.color }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── New Employee Onboarding ── */}
      <section className={styles.onboardingSection}>
        <div className={styles.onboardingGlow} aria-hidden />

        <div className={styles.onboardingInner}>
          <div className={styles.onboardingHeader}>
            <span className={styles.onboardingBadge}>
              <i className="fa-solid fa-user-tie" /> New Employee
            </span>
            <h2 className={styles.onboardingTitle}>How to Access Your Dashboard</h2>
            <p className={styles.onboardingSubtitle}>
              Your admin has already set up your account.
              Just follow these four quick steps to get in.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            {[
              {
                n: "01",
                icon: "fa-envelope-open-text",
                title: "Check Your Email",
                desc: "Your administrator sent a welcome email with a temporary password for your account.",
                color: "#00c5a0",
              },
              {
                n: "02",
                icon: "fa-right-to-bracket",
                title: "Sign In",
                desc: "Visit the Sign In page and log in using your work email and the temporary password.",
                color: "#06b6d4",
                action: { href: "/login", label: "Go to Sign In" },
              },
              {
                n: "03",
                icon: "fa-key",
                title: "Set Your Password",
                desc: "A secure prompt appears on first login — create a strong personal password instantly.",
                color: "#10b981",
              },
              {
                n: "04",
                icon: "fa-gauge-high",
                title: "You're In!",
                desc: "Explore tasks, timesheets, leave requests, and more from your personal dashboard.",
                color: "#f59e0b",
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={styles.stepCard}
              >
                <div className={styles.stepNum} style={{ color: step.color, borderColor: step.color + "33", background: step.color + "11" }}>
                  {step.n}
                </div>
                <div className={styles.stepIconWrap} style={{ background: step.color + "18", color: step.color }}>
                  <i className={`fa-solid ${step.icon}`} />
                </div>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.desc}</p>
                {step.action && (
                  <Link href={step.action.href} className={styles.stepBtn} style={{ background: step.color }}>
                    {step.action.label} <i className="fa-solid fa-arrow-right" />
                  </Link>
                )}
                {i < 3 && <div className={styles.stepConnector} aria-hidden />}
              </motion.div>
            ))}
          </div>

          <div className={styles.helpNote}>
            <i className="fa-solid fa-circle-info" />
            <span>
              Don&apos;t have credentials yet? Ask your workspace administrator to resend your welcome email.
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <i className="fa-solid fa-layer-group" /> NexAce CRM
        </div>
        <span className={styles.footerCopy}>
          © {new Date().getFullYear()} NexAce CRM · All rights reserved
        </span>
        <div className={styles.footerLinks}>
          <Link href="/guide" className={styles.footerLink}>User Guide</Link>
          <Link href="/login" className={styles.footerLink}>Sign In</Link>
          <Link href="/register" className={styles.footerLink}>Register</Link>
          <Link href="/dashboard" className={styles.footerLink}>Dashboard</Link>
        </div>
      </footer>

    </div>
  );
}
