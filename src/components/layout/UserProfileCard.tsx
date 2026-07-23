"use client";

import React from "react";
import Link from "next/link";
import styles from "./UserProfileCard.module.css";

interface UserProfileCardProps {
  userName: string;
  role: string;
  tenantName: string;
}

export function UserProfileCard({ userName, role, tenantName }: UserProfileCardProps) {
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className={styles.footer}>
      <div className={styles.tenantInfo}>{tenantName}</div>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userMeta}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role}</span>
          <div className={styles.actions}>
            <Link href="/dashboard/settings" className={styles.settingsBtn}>
              <i className="fa-solid fa-gear"></i> Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
