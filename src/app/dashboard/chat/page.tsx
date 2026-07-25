"use client";

import React, { useState, useEffect, useRef } from "react";

interface ChatMsg {
  _id: string;
  channel: string;
  senderName: string;
  senderRole?: string;
  content: string;
  createdAt: string;
}

interface AnnouncementData {
  _id: string;
  title: string;
  content: string;
  category: "Company News" | "Policy Update" | "Event" | "Urgent";
  authorName: string;
  pinned: boolean;
  createdAt: string;
}

// Dummy Mail item interface for Mail Center
interface MailItem {
  id: string;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  folder: "inbox" | "sent" | "starred" | "drafts";
  read: boolean;
}

// Dummy WhatsApp item interface for WhatsApp Panel
interface WAThread {
  id: string;
  contactName: string;
  phone: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  status: "Active" | "Pending" | "Closed";
  messages: Array<{ sender: "client" | "agent"; text: string; time: string }>;
}

const INITIAL_MAILS: MailItem[] = [
  {
    id: "m1",
    sender: "Acme Enterprises",
    email: "billing@acme.com",
    subject: "Q3 Retainer Contract Renewal",
    preview: "Hello Team, we would like to extend our monthly retainer by 20 hours starting next month...",
    body: "Hello Team,\n\nWe would like to extend our monthly retainer by 20 hours starting next month. Please review the updated scope document attached.\n\nBest regards,\nAcme Procurement Team",
    date: "10:45 AM",
    folder: "inbox",
    read: false,
  },
  {
    id: "m2",
    sender: "Starlight Media",
    email: "sarah@starlight.io",
    subject: "Sprint Deliverable Feedback & Sign-off",
    preview: "The new UI dashboard looks fantastic! We have signed off on the milestone...",
    body: "Hi NexAce Team,\n\nThe new UI dashboard looks fantastic! We have signed off on the milestone in your client portal. Thanks for the quick turnaround.\n\nCheers,\nSarah",
    date: "Yesterday",
    folder: "inbox",
    read: true,
  },
  {
    id: "m3",
    sender: "Internal Payroll",
    email: "hr@nexace.internal",
    subject: "Monthly Expense Reimbursements Approved",
    preview: "Your July expense report has been approved and processed for payment...",
    body: "Hi Team,\n\nYour July expense report has been approved and processed. Payout will be reflected in your registered account by Friday.\n\nHR Department",
    date: "Jul 22",
    folder: "inbox",
    read: true,
  },
];

const INITIAL_WA_THREADS: WAThread[] = [
  {
    id: "wa1",
    contactName: "Michael Scott (Global Tech)",
    phone: "+1 (555) 234-5678",
    lastMessage: "Can we schedule a quick call regarding the API integration deadline?",
    time: "11:20 AM",
    unreadCount: 2,
    status: "Active",
    messages: [
      { sender: "client", text: "Hi! Quick question about project milestone 2.", time: "11:18 AM" },
      { sender: "client", text: "Can we schedule a quick call regarding the API integration deadline?", time: "11:20 AM" },
    ],
  },
  {
    id: "wa2",
    contactName: "Elena Rostova (Lead)",
    phone: "+1 (555) 876-5432",
    lastMessage: "Thanks for sending over the proposal pricing tier sheet!",
    time: "Yesterday",
    unreadCount: 0,
    status: "Pending",
    messages: [
      { sender: "agent", text: "Hello Elena, attached is the revised proposal for your review.", time: "Yesterday 4:15 PM" },
      { sender: "client", text: "Thanks for sending over the proposal pricing tier sheet!", time: "Yesterday 4:30 PM" },
    ],
  },
];

export default function CommunicationHub() {
  const [activeTab, setActiveTab] = useState<"chat" | "mail" | "whatsapp" | "announcements">("chat");

  // Chat tab state
  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mail tab state
  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);
  const [selectedMailFolder, setSelectedMailFolder] = useState<"inbox" | "sent" | "starred" | "drafts">("inbox");
  const [selectedMailId, setSelectedMailId] = useState<string>("m1");

  // WhatsApp tab state
  const [waThreads, setWaThreads] = useState<WAThread[]>(INITIAL_WA_THREADS);
  const [selectedWaId, setSelectedWaId] = useState<string>("wa1");
  const [waReplyText, setWaReplyText] = useState("");

  // Announcements state
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: "",
    content: "",
    category: "Company News" as AnnouncementData["category"],
    pinned: false,
  });

  // Fetch Chat messages
  const fetchMessages = async (channel: string) => {
    try {
      setLoadingChat(true);
      const res = await fetch(`/api/chat/messages?channel=${channel}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Fetch chat messages error:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/chat/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error("Fetch announcements error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      fetchMessages(selectedChannel);
      // Real-time polling every 3 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedChannel);
      }, 3000);
      return () => clearInterval(interval);
    } else if (activeTab === "announcements") {
      fetchAnnouncements();
    }
  }, [activeTab, selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          content: newMessageText,
        }),
      });

      if (res.ok) {
        setNewMessageText("");
        fetchMessages(selectedChannel);
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const handleSendWaReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waReplyText.trim()) return;

    setWaThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === selectedWaId) {
          const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return {
            ...thread,
            lastMessage: waReplyText,
            time: now,
            messages: [...thread.messages, { sender: "agent", text: waReplyText, time: now }],
          };
        }
        return thread;
      })
    );
    setWaReplyText("");
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/chat/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(annForm),
      });

      if (res.ok) {
        setShowAnnModal(false);
        setAnnForm({ title: "", content: "", category: "Company News", pinned: false });
        fetchAnnouncements();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to publish announcement");
      }
    } catch (err) {
      console.error("Create announcement error:", err);
    }
  };

  const selectedMail = mails.find((m) => m.id === selectedMailId);
  const selectedWaThread = waThreads.find((w) => w.id === selectedWaId);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto", height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      {/* Header & Main Navigation Tabs */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          Communication Hub
        </h1>
        <p style={{ color: "var(--color-text-dark-secondary, #cbd5e1)", fontSize: "0.95rem", marginBottom: "1rem" }}>
          Real-time workspace chat, Mail Center, WhatsApp Business panel, and company announcements.
        </p>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("chat")}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              backgroundColor: activeTab === "chat" ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="fa-solid fa-comments" />
            Workspace Chat
          </button>

          <button
            onClick={() => setActiveTab("mail")}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              backgroundColor: activeTab === "mail" ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="fa-solid fa-envelope" />
            Mail Center
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              backgroundColor: activeTab === "whatsapp" ? "#10b981" : "rgba(255,255,255,0.05)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="fa-brands fa-whatsapp" />
            WhatsApp Panel
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              backgroundColor: activeTab === "announcements" ? "var(--color-primary, #6366f1)" : "rgba(255,255,255,0.05)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="fa-solid fa-bullhorn" />
            Announcements
          </button>
        </div>
      </div>

      {/* TAB 1: WORKSPACE CHAT */}
      {activeTab === "chat" && (
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1rem", flex: 1, overflow: "hidden" }}>
          {/* Channels & DMs Sidebar */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "1rem", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Channels
            </div>
            {["general", "projects", "engineering", "random"].map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: selectedChannel === ch ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  color: selectedChannel === ch ? "#fff" : "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <i className="fa-solid fa-hashtag" style={{ fontSize: "0.75rem", color: "#94a3b8" }} />
                {ch}
              </button>
            ))}

            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginTop: "1.25rem", marginBottom: "0.75rem" }}>
              Direct Messages
            </div>
            {["dm_team1", "dm_team2"].map((dm) => (
              <button
                key={dm}
                onClick={() => setSelectedChannel(dm)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: selectedChannel === dm ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  color: selectedChannel === dm ? "#fff" : "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <i className="fa-solid fa-circle" style={{ fontSize: "0.5rem", color: "#10b981" }} />
                {dm === "dm_team1" ? "Sarah Connor" : "David Miller"}
              </button>
            ))}
          </div>

          {/* Active Chat Conversation Feed */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "1rem", display: "flex", flexDirection: "column" }}>
            {/* Conversation Header */}
            <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-hashtag" style={{ color: "var(--color-primary)" }} />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedChannel}</h2>
            </div>

            {/* Messages Scroll Feed */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 0", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {loadingChat ? (
                <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "2rem" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} /> Loading chat...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", marginTop: "3rem" }}>
                  <i className="fa-regular fa-comments" style={{ fontSize: "2rem", marginBottom: "0.5rem", display: "block" }} />
                  No messages in #{selectedChannel} yet. Be the first to say hello!
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m._id} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.15rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{m.senderName}</span>
                      {m.senderRole && (
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.08)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                          {m.senderRole}
                        </span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: "0.925rem", lineHeight: 1.4 }}>{m.content}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <input
                type="text"
                placeholder={`Message #${selectedChannel}...`}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.65rem 0.85rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "0.65rem 1.1rem",
                  backgroundColor: "var(--color-primary, #6366f1)",
                  color: "#fff",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MAIL CENTER */}
      {activeTab === "mail" && (
        <div style={{ display: "grid", gridTemplateColumns: "180px 320px 1fr", gap: "1rem", flex: 1, overflow: "hidden" }}>
          {/* Folders Sidebar */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Mail Folders
            </div>
            {[
              { id: "inbox", label: "Inbox", icon: "fa-inbox" },
              { id: "starred", label: "Starred", icon: "fa-star" },
              { id: "sent", label: "Sent", icon: "fa-paper-plane" },
              { id: "drafts", label: "Drafts", icon: "fa-file-lines" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedMailFolder(f.id as any)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: selectedMailFolder === f.id ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  color: selectedMailFolder === f.id ? "#fff" : "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <i className={`fa-solid ${f.icon}`} style={{ fontSize: "0.8rem", color: "#94a3b8" }} />
                {f.label}
              </button>
            ))}
          </div>

          {/* Mail List Pane */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "0.75rem", overflowY: "auto" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.75rem", paddingLeft: "0.35rem" }}>
              Messages
            </div>
            {mails.map((mail) => (
              <div
                key={mail.id}
                onClick={() => setSelectedMailId(mail.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "10px",
                  cursor: "pointer",
                  backgroundColor: selectedMailId === mail.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  marginBottom: "0.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>{mail.sender}</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{mail.date}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.825rem", color: "var(--color-primary, #6366f1)", marginBottom: "0.2rem" }}>
                  {mail.subject}
                </div>
                <div style={{ fontSize: "0.775rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mail.preview}
                </div>
              </div>
            ))}
          </div>

          {/* Mail Reader Detail */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "1.5rem", display: "flex", flexDirection: "column" }}>
            {selectedMail ? (
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.75rem" }}>{selectedMail.subject}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <i className="fa-solid fa-circle-user" style={{ fontSize: "2rem", color: "#6366f1" }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff" }}>{selectedMail.sender}</div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{selectedMail.email}</div>
                  </div>
                </div>
                <div style={{ color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                  {selectedMail.body}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#64748b", marginTop: "4rem" }}>Select an email to view content.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP PANEL */}
      {activeTab === "whatsapp" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem", flex: 1, overflow: "hidden" }}>
          {/* Threads Sidebar */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "0.75rem", overflowY: "auto" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981", marginBottom: "0.75rem", paddingLeft: "0.35rem" }}>
              <i className="fa-brands fa-whatsapp" style={{ marginRight: "0.4rem" }} /> WhatsApp Client Threads
            </div>
            {waThreads.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedWaId(t.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "10px",
                  cursor: "pointer",
                  backgroundColor: selectedWaId === t.id ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  marginBottom: "0.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#fff" }}>{t.contactName}</span>
                  <span style={{ fontSize: "0.725rem", color: "#64748b" }}>{t.time}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.lastMessage}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Window */}
          <div className="glass-panel" style={{ borderRadius: "14px", padding: "1rem", display: "flex", flexDirection: "column" }}>
            {selectedWaThread ? (
              <>
                <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{selectedWaThread.contactName}</h3>
                    <div style={{ fontSize: "0.775rem", color: "#10b981" }}>{selectedWaThread.phone}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "12px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontWeight: 700 }}>
                    WhatsApp API Connected
                  </span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedWaThread.messages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: m.sender === "agent" ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        backgroundColor: m.sender === "agent" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                        padding: "0.65rem 0.9rem",
                        borderRadius: "12px",
                      }}
                    >
                      <div style={{ fontSize: "0.9rem", color: "#fff" }}>{m.text}</div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "right", marginTop: "0.2rem" }}>{m.time}</div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSendWaReply} style={{ display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    type="text"
                    placeholder="Type a WhatsApp reply..."
                    value={waReplyText}
                    onChange={(e) => setWaReplyText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "0.65rem 1.1rem",
                      backgroundColor: "#10b981",
                      color: "#fff",
                      borderRadius: "8px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <i className="fa-solid fa-paper-plane" />
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#64748b", marginTop: "4rem" }}>Select a WhatsApp conversation thread.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ANNOUNCEMENTS BOARD */}
      {activeTab === "announcements" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Company-Wide Announcements</h2>
            <button
              onClick={() => setShowAnnModal(true)}
              style={{
                padding: "0.55rem 1.1rem",
                backgroundColor: "var(--color-primary, #6366f1)",
                color: "#fff",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <i className="fa-solid fa-plus" /> Post Announcement
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {announcements.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "#64748b" }}>
                <i className="fa-solid fa-bullhorn" style={{ fontSize: "2.5rem", marginBottom: "0.75rem", display: "block" }} />
                No announcements posted yet.
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann._id}
                  className="glass-panel"
                  style={{
                    borderRadius: "14px",
                    padding: "1.25rem",
                    border: ann.pinned ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: ann.category === "Urgent" ? "rgba(239,68,68,0.2)" : "rgba(99,102,241,0.2)",
                        color: ann.category === "Urgent" ? "#ef4444" : "#6366f1",
                      }}
                    >
                      {ann.category}
                    </span>
                    {ann.pinned && <i className="fa-solid fa-thumbtack" style={{ color: "#f59e0b" }} title="Pinned Announcement" />}
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>{ann.title}</h3>
                  <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.4, marginBottom: "1rem" }}>{ann.content}</p>

                  <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                    <span>By {ann.authorName}</span>
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Post Announcement */}
      {showAnnModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "16px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "480px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Post Announcement</h2>
              <button onClick={() => setShowAnnModal(false)} style={{ color: "#94a3b8", cursor: "pointer" }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>Title *</label>
                <input
                  type="text"
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  placeholder="e.g. Q3 Town Hall Schedule"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>Category</label>
                <select
                  value={annForm.category}
                  onChange={(e) => setAnnForm({ ...annForm, category: e.target.value as any })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <option value="Company News">Company News</option>
                  <option value="Policy Update">Policy Update</option>
                  <option value="Event">Event</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "0.35rem", fontWeight: 600 }}>Content *</label>
                <textarea
                  required
                  rows={4}
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  placeholder="Announcement details..."
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={annForm.pinned}
                  onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })}
                />
                <label htmlFor="pinCheck" style={{ fontSize: "0.85rem", color: "#cbd5e1", cursor: "pointer" }}>
                  Pin announcement to top
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  style={{ padding: "0.55rem 1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.06)", color: "#cbd5e1", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", backgroundColor: "var(--color-primary, #6366f1)", color: "#fff", fontWeight: 600 }}
                >
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
