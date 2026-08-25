"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./UserProfileCard.module.css";
import { BrokenPhotoPlaceholder } from "@/components/ui/BrokenPhotoPlaceholder";

interface UserProfileCardProps {
  userName: string;
  role: string;
  tenantName: string;
  photoUrl?: string;
}

export function UserProfileCard({ userName, role, tenantName, photoUrl }: UserProfileCardProps) {
  const [photoBroken, setPhotoBroken] = useState(false);

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
        <div className={styles.avatar}>
          {photoUrl && !photoBroken ? (
            <img
              src={photoUrl}
              alt={userName}
              className="w-full h-full rounded-full object-cover"
              onError={() => setPhotoBroken(true)}
            />
          ) : photoBroken ? (
            /* Broken photo — show placeholder that links to settings */
            <BrokenPhotoPlaceholder
              size="sm"
              showReuploadHint
              linkToSettings
              className="w-full h-full"
            />
          ) : (
            initials
          )}
        </div>
        <div className={styles.userMeta}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role}</span>
          {photoBroken && (
            <Link
              href="/dashboard/settings"
              className="text-amber-500 text-[10px] font-semibold hover:underline flex items-center gap-1 mt-0.5"
              title="Re-upload profile photo"
            >
              <i className="fa-solid fa-triangle-exclamation text-[9px]" />
              Photo broken — fix it
            </Link>
          )}
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
