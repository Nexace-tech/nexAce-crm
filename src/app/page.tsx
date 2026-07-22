import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <header className={`${styles.header} glass-panel`}>
        <div className={styles.logoSection}>
          <i className="fa-solid fa-gem" style={{ marginRight: "0.25rem" }}></i> NexAce CRM
        </div>
        <nav className={styles.nav}>
          <Link href="/login" className={styles.navLink}>
            Sign In
          </Link>
          <Link href="/dashboard" className={styles.btnPrimary}>
            Enter Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.badge}>
          <i className="fa-solid fa-rocket" style={{ marginRight: "0.25rem" }}></i> Enterprise Grade Multi-Tenant SaaS
        </div>
        
        <h1 className={styles.title}>
          The Unified Workspace for <br />
          <span className={styles.titleHighlight}>Scale & Efficiency</span>
        </h1>
        
        <p className={styles.subtitle}>
          Simplify your team operations. Manage sprints, track projects, automate HR checklists, monitor OKRs & KPIs, and organize client relationships in a single workspace.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/dashboard" className={styles.btnPrimary}>
            Get Started Free
          </Link>
          <Link href="/register" className={styles.btnSecondary}>
            Register Tenant
          </Link>
        </div>

        {/* Feature Grid */}
        <div className={styles.grid}>
          <div className={`${styles.card} glass-panel`}>
            <span className={styles.cardIcon}>
              <i className="fa-solid fa-chart-line"></i>
            </span>
            <h3 className={styles.cardTitle}>Goals & Analytics</h3>
            <p className={styles.cardDesc}>
              Keep OKRs and KPIs distinct. Empower individual performance while keeping corporate strategy aligned.
            </p>
          </div>

          <div className={`${styles.card} glass-panel`}>
            <span className={styles.cardIcon}>
              <i className="fa-solid fa-folder-tree"></i>
            </span>
            <h3 className={styles.cardTitle}>Sprint & Projects</h3>
            <p className={styles.cardDesc}>
              A comprehensive Kanban & Gantt timeline combined with resource allocation. Real-time wiki and local Drive storage.
            </p>
          </div>

          <div className={`${styles.card} glass-panel`}>
            <span className={styles.cardIcon}>
              <i className="fa-solid fa-users"></i>
            </span>
            <h3 className={styles.cardTitle}>HR & Operations</h3>
            <p className={styles.cardDesc}>
              Manage onboarding, probation, timesheets, approvals, document vaulting, and employee case management instantly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
