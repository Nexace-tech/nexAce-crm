import Link from "next/link";
import styles from "./page.module.css";

export default function DashboardHome() {
  return (
    <div>
      {/* Welcome Header */}
      <div className={styles.header}>
        <h1 className={styles.welcomeTitle}>Welcome back, John!</h1>
        <p className={styles.welcomeDesc}>Here is what's happening with Acme Corp today.</p>
      </div>

      {/* KPI Stats Grid */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiMeta}>
            <span>Active Projects</span>
            <i className="fa-solid fa-folder-open" style={{ color: "var(--color-primary)" }}></i>
          </div>
          <div className={styles.kpiValue}>12</div>
          <div className={styles.kpiTrend}>
            <span className={styles.trendUp}>
              <i className="fa-solid fa-arrow-trend-up"></i> +2
            </span>{" "}
            this week
          </div>
        </div>

        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiMeta}>
            <span>Monthly Retainers</span>
            <i className="fa-solid fa-wallet" style={{ color: "var(--color-success)" }}></i>
          </div>
          <div className={styles.kpiValue}>$42,800</div>
          <div className={styles.kpiTrend}>
            <span className={styles.trendUp}>
              <i className="fa-solid fa-arrow-trend-up"></i> +8.4%
            </span>{" "}
            vs last month
          </div>
        </div>

        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiMeta}>
            <span>Timesheet Approvals</span>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: "var(--color-warning)" }}></i>
          </div>
          <div className={styles.kpiValue}>4 Pending</div>
          <div className={styles.kpiTrend}>
            <span className={styles.trendDown}>
              <i className="fa-solid fa-arrow-trend-down"></i> 12h
            </span>{" "}
            avg completion time
          </div>
        </div>

        <div className={`${styles.kpiCard} glass-panel`}>
          <div className={styles.kpiMeta}>
            <span>Referrals Pipeline</span>
            <i className="fa-solid fa-link" style={{ color: "var(--color-info)" }}></i>
          </div>
          <div className={styles.kpiValue}>$3,500</div>
          <div className={styles.kpiTrend}>
            <span className={styles.trendUp}>
              <i className="fa-solid fa-circle-check"></i> 2 Hired
            </span>{" "}
            waiting payout
          </div>
        </div>
      </div>

      {/* Dashboard Main Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left main content panels */}
        <div className={styles.mainPanel}>
          {/* Active Projects module summary */}
          <div className={`${styles.sectionCard} glass-panel`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fa-solid fa-screwdriver-wrench" style={{ color: "var(--color-primary)", marginRight: "0.25rem" }}></i> Active Projects
              </h2>
              <Link href="/dashboard/projects" className={styles.viewAllLink}>
                View Sprint Board
              </Link>
            </div>
            
            <div className={styles.projectList}>
              <div className={styles.projectItem}>
                <div className={styles.projectInfo}>
                  <span className={styles.projectName}>NexAce CRM Implementation</span>
                  <span className={styles.projectClient}>Client: internal | Deadline: Aug 15</span>
                </div>
                <span className={`${styles.projectStatus} ${styles.statusActive}`}>Sprint 2</span>
              </div>

              <div className={styles.projectItem}>
                <div className={styles.projectInfo}>
                  <span className={styles.projectName}>Client Portal Integration</span>
                  <span className={styles.projectClient}>Client: Ziqsy | Deadline: Sep 1</span>
                </div>
                <span className={`${styles.projectStatus} ${styles.statusActive}`}>Design Phase</span>
              </div>

              <div className={styles.projectItem}>
                <div className={styles.projectInfo}>
                  <span className={styles.projectName}>Website Redesign</span>
                  <span className={styles.projectClient}>Client: Acme Retail | Deadline: Jul 30</span>
                </div>
                <span className={`${styles.projectStatus} ${styles.statusCompleted}`}>Testing</span>
              </div>
            </div>
          </div>

          {/* Goals & OKRs module summary */}
          <div className={`${styles.sectionCard} glass-panel`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fa-solid fa-bullseye" style={{ color: "var(--color-danger)", marginRight: "0.25rem" }}></i> Strategic OKRs (Q3)
              </h2>
              <Link href="/dashboard/goals" className={styles.viewAllLink}>
                Manage Goals
              </Link>
            </div>
            
            <div className={styles.projectList}>
              <div className={styles.projectItem}>
                <div className={styles.projectInfo}>
                  <span className={styles.projectName}>Scale tenant capacity to 500 teams</span>
                  <span className={styles.projectClient}>Target: 100% | Current: 65%</span>
                </div>
                <span className={`${styles.projectStatus} ${styles.statusActive}`}>On Track</span>
              </div>

              <div className={styles.projectItem}>
                <div className={styles.projectInfo}>
                  <span className={styles.projectName}>Achieve &gt;95% client satisfaction score</span>
                  <span className={styles.projectClient}>Target: 95% | Current: 92%</span>
                </div>
                <span className={`${styles.projectStatus} ${styles.statusActive}`}>On Track</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side panels */}
        <div className={styles.sidePanel}>
          {/* Recent Audit Log Activity */}
          <div className={`${styles.sectionCard} glass-panel`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: "var(--color-info)", marginRight: "0.25rem" }}></i> System Activity Trail
              </h2>
              <Link href="/dashboard/settings" className={styles.viewAllLink}>
                View Full Log
              </Link>
            </div>

            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <div className={styles.activityDot}></div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityContent}>
                    <strong>John Doe</strong> approved a timesheet for <em>Design Phase</em>.
                  </span>
                  <span className={styles.activityTime}>10 minutes ago</span>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityDot}></div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityContent}>
                    <strong>Sarah Jenkins</strong> requested leave for <em>Summer Vacation</em>.
                  </span>
                  <span className={styles.activityTime}>2 hours ago</span>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityDot}></div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityContent}>
                    <strong>Admin</strong> changed billing configurations for tenant <em>Ziqsy</em>.
                  </span>
                  <span className={styles.activityTime}>1 day ago</span>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityDot}></div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityContent}>
                    <strong>Marcus Wu</strong> joined the <em>Development</em> team directory.
                  </span>
                  <span className={styles.activityTime}>3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
