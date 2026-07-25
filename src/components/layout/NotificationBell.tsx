"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "@/app/dashboard/layout.module.css";

interface NotifItem {
  _id: string;
  title: string;
  message: string;
  type: "chat" | "announcement" | "task" | "system";
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Mark single read error:", err);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className={styles.iconBtn}
        onClick={() => setOpen(!open)}
        title="Notifications"
        style={{ position: "relative" }}
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#ef4444",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 800,
              padding: "0.1rem 0.35rem",
              borderRadius: "10px",
              minWidth: "16px",
              textAlign: "center",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Drawer */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "340px",
            backgroundColor: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "14px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-primary, #6366f1)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                <i className="fa-regular fa-bell-slash" style={{ fontSize: "1.5rem", marginBottom: "0.5rem", display: "block" }} />
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && handleMarkSingleRead(n._id)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    backgroundColor: n.read ? "transparent" : "rgba(99, 102, 241, 0.08)",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.825rem", color: n.read ? "#cbd5e1" : "#fff" }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.3 }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
