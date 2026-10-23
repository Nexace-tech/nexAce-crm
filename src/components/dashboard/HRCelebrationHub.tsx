"use client";

import React, { useState, useEffect } from "react";

interface CelebrationRosterItem {
  userId: string;
  name: string;
  photoUrl?: string;
  department: string;
  role: string;
  day: number;
  type: "birthday" | "anniversary";
  label: string;
}

interface WishFeedItem {
  _id: string;
  recipientId: string;
  recipientName: string;
  recipientDepartment?: string;
  recipientPhotoUrl?: string;
  senderId: string;
  senderName: string;
  senderDepartment?: string;
  senderPhotoUrl?: string;
  message: string;
  sticker: string;
  type: "birthday" | "anniversary";
  attachmentsCount: number;
  reactionsCount: number;
  acknowledged: boolean;
  createdAt: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function HRCelebrationHub({ className = "" }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<"roster" | "wishes">("roster");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [deletingWishId, setDeletingWishId] = useState<string | null>(null);

  const [monthlyRoster, setMonthlyRoster] = useState<Record<number, CelebrationRosterItem[]>>({});
  const [wishesFeed, setWishesFeed] = useState<WishFeedItem[]>([]);
  const [stats, setStats] = useState<{ totalWishesThisYear: number; thisMonthCelebrations: number; totalTeamMembers: number } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/birthdays/admin");
      if (res.ok) {
        const data = await res.json();
        setMonthlyRoster(data.monthlyRoster || {});
        setWishesFeed(data.wishesFeed || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch HR celebrations data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerBroadcast = async () => {
    setBroadcasting(true);
    setBroadcastMsg("");
    try {
      const res = await fetch("/api/birthdays/broadcast", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const count = data.broadcastedCelebrants?.length || 0;
        setBroadcastMsg(
          count > 0
            ? `Broadcasted announcements for ${count} celebrant(s) to #general!`
            : "Broadcast evaluated: No new celebrants to announce today or already posted."
        );
      } else {
        setBroadcastMsg(data.error || "Broadcast failed");
      }
    } catch (err: any) {
      setBroadcastMsg(err?.message || "Failed to trigger broadcast");
    } finally {
      setBroadcasting(false);
      setTimeout(() => setBroadcastMsg(""), 6000);
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    if (!window.confirm("Are you sure you want to moderate and delete this celebration wish?")) return;
    setDeletingWishId(wishId);
    try {
      const res = await fetch(`/api/birthdays/wish?id=${wishId}`, { method: "DELETE" });
      if (res.ok) {
        setWishesFeed((prev) => prev.filter((w) => w._id !== wishId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete wish");
      }
    } catch (err) {
      console.error("Error deleting wish:", err);
    } finally {
      setDeletingWishId(null);
    }
  };

  const selectedMonthRoster = monthlyRoster[selectedMonth] || [];

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-5 ${className}`}>
      {/* Header with Broadcast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center text-lg shrink-0">
            <i className="fa-solid fa-cake-candles" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                Celebration &amp; Culture Hub
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                HR Management
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Year-round celebration planning, team wishes moderation, and announcement broadcasts
            </p>
          </div>
        </div>

        {/* Trigger Broadcast Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleTriggerBroadcast}
            disabled={broadcasting}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
            title="Scan today's celebrants, post card to #general chat, and send 3-day notice to managers"
          >
            <i className={`fa-solid ${broadcasting ? "fa-spinner fa-spin" : "fa-bullhorn"} text-xs`} />
            <span>{broadcasting ? "Broadcasting..." : "Broadcast Today's Cards"}</span>
          </button>
        </div>
      </div>

      {broadcastMsg && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-2">
          <i className="fa-solid fa-circle-info shrink-0" />
          <span>{broadcastMsg}</span>
        </div>
      )}

      {/* Stats Counter Bar */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-[11px] text-muted-foreground font-medium">This Month's Celebrations</span>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{stats.thisMonthCelebrations}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-[11px] text-muted-foreground font-medium">Total Wishes Sent This Year</span>
            <p className="text-xl font-extrabold text-pink-500 mt-0.5">{stats.totalWishesThisYear}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-[11px] text-muted-foreground font-medium">Active Team Members</span>
            <p className="text-xl font-extrabold text-indigo-500 mt-0.5">{stats.totalTeamMembers}</p>
          </div>
        </div>
      )}

      {/* Sub-view Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[38px] ${
            activeTab === "roster"
              ? "bg-muted text-foreground border border-border shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <i className="fa-solid fa-calendar-days text-pink-500" />
          <span>Annual Celebrations Roster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wishes")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all min-h-[38px] ${
            activeTab === "wishes"
              ? "bg-muted text-foreground border border-border shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <i className="fa-solid fa-envelope-open-text text-indigo-500" />
          <span>Wishes Moderation Feed ({wishesFeed.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <i className="fa-solid fa-spinner fa-spin text-xl text-indigo-500" />
          <span className="text-xs">Loading celebration management data...</span>
        </div>
      ) : activeTab === "roster" ? (
        /* 1. Monthly Celebrations Roster */
        <div className="space-y-4">
          {/* Month Filter Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {MONTH_NAMES.map((mName, idx) => {
              const mNum = idx + 1;
              const isSelected = selectedMonth === mNum;
              const count = monthlyRoster[mNum]?.length || 0;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => setSelectedMonth(mNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 min-h-[34px] ${
                    isSelected
                      ? "bg-pink-600 text-white shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{mName}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Roster Cards List */}
          {selectedMonthRoster.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No birthdays or work anniversaries in {MONTH_NAMES[selectedMonth - 1]}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedMonthRoster.map((item, idx) => {
                const isAnniv = item.type === "anniversary";
                return (
                  <div
                    key={`${item.userId}-${idx}`}
                    className="p-3.5 rounded-2xl border border-border/80 bg-card/60 hover:bg-muted/10 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <h5 className="font-semibold text-xs text-foreground truncate">{item.name}</h5>
                        <p className="text-[11px] text-muted-foreground truncate">{item.department}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                        isAnniv
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                          : "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. Wishes Moderation Feed */
        <div className="space-y-3">
          {wishesFeed.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
              No celebration wishes have been recorded yet this calendar year.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Celebrant (Recipient)</th>
                    <th className="p-3">Sender</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Media</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {wishesFeed.map((wish) => (
                    <tr key={wish._id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-bold flex items-center justify-center">
                            {wish.recipientName.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{wish.recipientName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {wish.senderName} ({wish.senderDepartment || "Team"})
                      </td>
                      <td className="p-3 max-w-xs truncate text-foreground/90">
                        "{wish.message}"
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {wish.attachmentsCount > 0 ? (
                          <span className="text-[11px] font-semibold text-indigo-500 flex items-center gap-1">
                            <i className="fa-solid fa-paperclip" />
                            <span>{wish.attachmentsCount} file(s)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-muted-foreground">
                        {new Date(wish.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteWish(wish._id)}
                          disabled={deletingWishId === wish._id}
                          className="min-h-[32px] px-2.5 py-1 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                          title="Delete wish"
                        >
                          <i className={`fa-solid ${deletingWishId === wish._id ? "fa-spinner fa-spin" : "fa-trash-can"} text-[11px]`} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
