"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/dashboard/layout.module.css";
import { UserProfileCard } from "@/components/layout/UserProfileCard";
import { LogoutHeaderBtn } from "@/components/layout/LogoutHeaderBtn";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

interface DashboardClientLayoutProps {
  session: {
    userName: string;
    role: string;
    tenantName: string;
  };
  menuItems: MenuItem[];
  children: React.ReactNode;
}

export function DashboardClientLayout({ session, menuItems, children }: DashboardClientLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className={styles.container}>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ""} glass-panel`}>
        <div className={styles.brand} style={{ justifyContent: "space-between" }}>
          <span>
            <i className="fa-solid fa-gem" style={{ marginRight: "0.25rem" }}></i> NexAce CRM
          </span>
          <button
            className={styles.mobileCloseBtn}
            onClick={() => setMobileOpen(false)}
            title="Close menu"
          >
            ×
          </button>
        </div>

        <nav className={styles.navSection}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <i className={item.icon} style={{ width: "20px" }}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <UserProfileCard
          userName={session.userName}
          role={session.role}
          tenantName={session.tenantName}
        />
      </aside>

      {/* Main Workspace */}
      <div className={styles.contentWrapper}>
        <header className={`${styles.header} glass-panel`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
            <button
              className={styles.hamburgerBtn}
              onClick={() => setMobileOpen(true)}
              title="Open Navigation Menu"
            >
              <i className="fa-solid fa-bars"></i>
            </button>

            <div className={styles.searchBar}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-muted)" }}></i>
              <input
                type="text"
                placeholder="Search projects, people..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.headerActions}>
            <NotificationBell />
            <LogoutHeaderBtn />
          </div>
        </header>

        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
