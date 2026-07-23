import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import styles from "./layout.module.css";
import { UserProfileCard } from "@/components/layout/UserProfileCard";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  const menuItems = [
    { name: "Overview", href: "/dashboard", icon: "fa-solid fa-chart-simple" },
    { name: "My Team", href: "/dashboard/team", icon: "fa-solid fa-users" },
    { name: "Calendar & Timesheets", href: "/dashboard/calendar", icon: "fa-solid fa-calendar-days" },
    { name: "Projects & Drive", href: "/dashboard/projects", icon: "fa-solid fa-folder-tree" },
    { name: "Chat & Mail", href: "/dashboard/chat", icon: "fa-solid fa-comments" },
    { name: "HR Portal", href: "/dashboard/hr", icon: "fa-solid fa-briefcase" },
    { name: "Goals & OKRs", href: "/dashboard/goals", icon: "fa-solid fa-bullseye" },
    { name: "Analytics Logs", href: "/dashboard/analytics", icon: "fa-solid fa-chart-line" },
    { name: "CRM Retainers", href: "/dashboard/clients", icon: "fa-solid fa-handshake" },
    { name: "Referral Pipeline", href: "/dashboard/referrals", icon: "fa-solid fa-link" },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} glass-panel`}>
        <div className={styles.brand}>
          <i className="fa-solid fa-gem" style={{ marginRight: "0.25rem" }}></i> NexAce CRM
        </div>
        
        <nav className={styles.navSection}>
          {menuItems.map((item) => (
            <Link key={item.name} href={item.href} className={styles.navLink}>
              <i className={item.icon} style={{ width: "20px" }}></i>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer (Tenant / User details) */}
        <UserProfileCard
          userName={session.userName}
          role={session.role}
          tenantName={session.tenantName}
        />
      </aside>

      {/* Main Workspace */}
      <div className={styles.contentWrapper}>
        <header className={`${styles.header} glass-panel`}>
          <div className={styles.searchBar}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-muted)" }}></i>
            <input 
              type="text" 
              placeholder="Search across files, projects, people..." 
              className={styles.searchInput}
            />
          </div>

          <div className={styles.headerActions}>
            <button className={styles.iconBtn} title="Notifications">
              <i className="fa-solid fa-bell"></i>
            </button>
            <button className={styles.iconBtn} title="Quick Action">
              <i className="fa-solid fa-plus"></i>
            </button>
            <LogoutHeaderBtn />
          </div>
        </header>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
