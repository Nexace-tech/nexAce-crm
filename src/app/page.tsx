import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
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
            <i className="fa-solid fa-gem" />
          </span>
          <span className={styles.logoText}>NexAce <span className={styles.logoCRM}>CRM</span></span>
        </div>
        <nav className={styles.nav}>
          <Link href="/login" className={styles.navLink}>
            <i className="fa-solid fa-right-to-bracket" /> Sign In
          </Link>
          <Link href="/dashboard" className={styles.btnPrimary}>
            <i className="fa-solid fa-rocket" /> Enter Dashboard
          </Link>
        </nav>
      </header>

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

        <div className={styles.ctaGroup}>
          <Link href="/dashboard" className={styles.btnHero}>
            <i className="fa-solid fa-bolt" /> Get Started Free
          </Link>
          <Link href="/register" className={styles.btnGhost}>
            <i className="fa-solid fa-building" /> Register Workspace
          </Link>
        </div>

        {/* ── Stat Pills ── */}
        <div className={styles.stats}>
          {[
            { icon: "fa-users", value: "10k+", label: "Employees Managed" },
            { icon: "fa-layer-group", value: "500+", label: "Workspaces Active" },
            { icon: "fa-star", value: "4.9", label: "Avg. Rating" },
          ].map((s) => (
            <div key={s.label} className={styles.statPill}>
              <i className={`fa-solid ${s.icon}`} />
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Feature Cards ── */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionLabel}>
          <i className="fa-solid fa-sparkles" /> What&apos;s Inside
        </div>
        <h2 className={styles.sectionTitle}>Everything Your Team Needs</h2>
        <p className={styles.sectionSubtitle}>
          Powerful modules that actually talk to each other — no integrations required.
        </p>

        <div className={styles.grid}>
          {[
            {
              icon: "fa-chart-line",
              color: "#6366f1",
              glow: "rgba(99,102,241,0.18)",
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
          ].map((f) => (
            <div key={f.title} className={styles.card} style={{ "--card-glow": f.glow } as React.CSSProperties}>
              <div className={styles.cardIconWrap} style={{ background: f.glow }}>
                <i className={`fa-solid ${f.icon}`} style={{ color: f.color }} />
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
              <div className={styles.cardAccent} style={{ background: f.color }} />
            </div>
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
                color: "#6366f1",
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
              <div key={step.n} className={styles.stepCard}>
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
              </div>
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
          <i className="fa-solid fa-gem" /> NexAce CRM
        </div>
        <span className={styles.footerCopy}>
          © {new Date().getFullYear()} NexAce CRM · All rights reserved
        </span>
        <div className={styles.footerLinks}>
          <Link href="/login" className={styles.footerLink}>Sign In</Link>
          <Link href="/register" className={styles.footerLink}>Register</Link>
          <Link href="/dashboard" className={styles.footerLink}>Dashboard</Link>
        </div>
      </footer>

    </div>
  );
}
