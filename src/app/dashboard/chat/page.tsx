"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMsg {
  _id: string;
  channel: string;
  senderName: string;
  senderRole?: string;
  content: string;
  parentId?: string;
  mentions?: string[];
  reactions?: Array<{ emoji: string; users: string[] }>;
  read?: boolean;
  readBy?: string[];
  readAt?: string;
  deletedForEveryone?: boolean;
  deletedForUsers?: string[];
  attachments?: Array<{ name: string; url: string; mimeType: string; size: number }>;
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
];

const REACTION_COLOR_MAP: Record<string, string> = {
  "fa-thumbs-up": "text-primary",
  "fa-heart": "text-rose-500",
  "fa-fire": "text-amber-500",
  "fa-rocket": "text-indigo-500",
  "fa-face-smile": "text-yellow-500",
  "fa-hands-clapping": "text-emerald-500",
};

import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useAuthContext } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

export default function CommunicationHub() {
  const { user } = useAuthContext();
  const { can, canAccessModule, isAdmin, isOPS } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence<"chat" | "mail" | "whatsapp" | "video" | "announcements" | "settings">(
    "chat_active_tab",
    "chat",
    ["chat", "mail", "whatsapp", "video", "announcements", "settings"]
  ); 

  // Chat State
  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<ChatMsg | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [activeReactionModal, setActiveReactionModal] = useState<{ messageId: string; emoji: string; users: string[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Channels State
  const [channelsList, setChannelsList] = useState<any[]>([]);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [channelError, setChannelError] = useState("");
  const [isSubmittingChannel, setIsSubmittingChannel] = useState(false);
  const [channelDeleteConfirm, setChannelDeleteConfirm] = useState<{ channelId: string; channelName: string } | null>(null);

  // Mail State
  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);
  const [selectedMailId, setSelectedMailId] = useState<string>("m1");
  const [mailFilter, setMailFilter] = useState<"inbox" | "sent" | "starred">("inbox");
  const [showComposeMail, setShowComposeMail] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const selectedMail = mails.find((m) => m.id === selectedMailId) || mails[0] || null;

  const handleSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;

    const newMail: MailItem = {
      id: `m_${Date.now()}`,
      sender: user?.name || "You",
      email: composeTo.trim(),
      subject: composeSubject.trim(),
      preview: composeBody.trim().substring(0, 80) + "...",
      body: composeBody.trim(),
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
      folder: "sent",
      read: true,
    };

    setMails((prev) => [newMail, ...prev]);
    setSelectedMailId(newMail.id);
    setMailFilter("sent");
    setShowComposeMail(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  };

  // WhatsApp State
  const [waThreads, setWaThreads] = useState<WAThread[]>(INITIAL_WA_THREADS);
  const [selectedWaId, setSelectedWaId] = useState<string>("wa1");
  const [waReplyText, setWaReplyText] = useState("");

  // Video Call State
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callRoomName, setCallRoomName] = useState("Project Alpha Huddle");

  // Announcements State
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: "",
    content: "",
    category: "Company News" as AnnouncementData["category"],
    pinned: false,
  });
  // Read Info & Forward & Delete Modals State
  const [readInfoMsg, setReadInfoMsg] = useState<ChatMsg | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMsg | null>(null);
  const [forwardTargetChannel, setForwardTargetChannel] = useState("general");
  const [deleteConfirm, setDeleteConfirm] = useState<{ msgId: string; deleteMode: "me" | "everyone"; content: string } | null>(null);

  // File Attachments State
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ name: string; url: string; mimeType: string; size: number }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate Image Only
    if (!file.type.startsWith("image/")) {
      alert("Only image files (PNG, JPG, JPEG, WEBP, GIF, SVG) are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Validate Max Size 10MB
    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      alert(`File size exceeds the ${MAX_SIZE_MB}MB limit. Please select an image smaller than 10MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("folder", "Chat");

      const res = await fetch("/api/drive", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const driveFile = data.file;
        setPendingAttachments((prev) => [
          ...prev,
          {
            name: driveFile.name,
            url: `/api/drive/download?fileId=${driveFile._id}`,
            mimeType: driveFile.mimeType,
            size: driveFile.size,
          },
        ]);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload image attachment");
      }
    } catch (err) {
      console.error("Upload attachment error:", err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmExecuteMessageDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: deleteConfirm.msgId, deleteMode: deleteConfirm.deleteMode }),
      });
      if (res.ok) {
        fetchMessages(selectedChannel, true);
        setSelectedMsgId(null);
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };

  const handleForwardMessage = async (targetChannel: string) => {
    if (!forwardMsg) return;
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: targetChannel,
          content: `↳ Forwarded message from @${forwardMsg.senderName}:\n${forwardMsg.content}`,
          isDM: targetChannel.startsWith("dm_"),
        }),
      });
      if (res.ok) {
        setForwardMsg(null);
        setSelectedMsgId(null);
        fetchMessages(selectedChannel, true);
      }
    } catch (err) {
      console.error("Forward message error:", err);
    }
  };

  // Notification Preferences State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notifyPrefs, setNotifyPrefs] = useState({
    chatPings: true,
    mailAlerts: true,
    hrApprovals: false,
    announcementPins: true,
    soundEnabled: true,
  });

  const fetchTeam = async () => {
    try {
      let res = await fetch("/api/team");
      if (!res.ok) {
        res = await fetch("/api/hr/directory");
      }
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setTeamMembers(data.users);
        }
      }
    } catch (e) {
      console.error("fetchTeam error:", e);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const res = await fetch("/api/chat/messages?mode=conversations");
      if (res.ok) {
        const data = await res.json();
        setRecentConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("fetchRecentConversations error:", e);
    }
  };

  const fetchMessages = async (channel: string, silent = false) => {
    try {
      if (!silent) setLoadingChat(true);
      const res = await fetch(`/api/chat/messages?channel=${channel}`);
      if (res.ok) {
        const data = await res.json();
        const newMsgs: ChatMsg[] = data.messages || [];
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(newMsgs)) {
            return prev;
          }
          return newMsgs;
        });
      }
    } catch (err) {
      console.error("Fetch chat messages error:", err);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

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

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/chat/channels");
      if (res.ok) {
        const data = await res.json();
        const newChannels = data.channels || [];
        setChannelsList((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(newChannels)) {
            return prev;
          }
          return newChannels;
        });
      }
    } catch (e) {
      console.error("Fetch channels error:", e);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setIsSubmittingChannel(true);
    setChannelError("");
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName, description: newChannelDesc }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateChannelModal(false);
        setNewChannelName("");
        setNewChannelDesc("");
        await fetchChannels();
        if (data.channel?.name) {
          setSelectedChannel(data.channel.name);
        }
      } else {
        setChannelError(data.error || "Failed to create channel.");
      }
    } catch (err) {
      console.error("Create channel error:", err);
      setChannelError("An error occurred while creating channel.");
    } finally {
      setIsSubmittingChannel(false);
    }
  };

  const handleTogglePinChannel = async (channelId: string, currentPinStatus: boolean) => {
    try {
      const res = await fetch("/api/chat/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, isPinned: !currentPinStatus }),
      });

      if (res.ok) {
        await fetchChannels();
      }
    } catch (err) {
      console.error("Toggle pin channel error:", err);
    }
  };

  const handleReactivateChannel = async (channelId: string) => {
    try {
      const res = await fetch("/api/chat/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, isActive: true }),
      });

      if (res.ok) {
        await fetchChannels();
      }
    } catch (err) {
      console.error("Reactivate channel error:", err);
    }
  };

  const handleDeleteChannel = (channelId: string, channelName: string) => {
    if (channelName === "general") {
      setChannelError("The #general channel cannot be removed.");
      return;
    }
    setChannelDeleteConfirm({ channelId, channelName });
  };

  const confirmExecuteDelete = async () => {
    if (!channelDeleteConfirm) return;
    const { channelId, channelName } = channelDeleteConfirm;

    try {
      const res = await fetch(`/api/chat/channels?id=${channelId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (selectedChannel === channelName) {
          setSelectedChannel("general");
        }
        await fetchChannels();
      } else {
        const data = await res.json();
        setChannelError(data.error || "Failed to delete channel.");
      }
    } catch (err) {
      console.error("Delete channel error:", err);
    } finally {
      setChannelDeleteConfirm(null);
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef<boolean>(true);
  const prevMsgLengthRef = useRef<number>(0);

  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      // Consider "near bottom" if within 120px of bottom
      isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlChannel = params.get("channel");
      if (urlChannel) {
        setSelectedChannel(urlChannel);
        setActiveTab("chat");
      }
    }
  }, []);

  useEffect(() => {
    fetchTeam();
    fetchRecentConversations();
    if (activeTab === "chat") {
      fetchChannels();
      // Force auto-scroll to bottom on channel change
      isUserNearBottomRef.current = true;
      fetchMessages(selectedChannel, false);
      const interval = setInterval(() => {
        fetchMessages(selectedChannel, true);
        fetchChannels();
        fetchRecentConversations();
      }, 3000);
      return () => clearInterval(interval);
    } else if (activeTab === "announcements") {
      fetchAnnouncements();
    }
  }, [activeTab, selectedChannel]);

  useEffect(() => {
    // Only scroll to bottom if user is already near bottom, or if a new message was added
    if (messages.length > 0) {
      if (isUserNearBottomRef.current || messages.length > prevMsgLengthRef.current) {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }
    }
    prevMsgLengthRef.current = messages.length;
  }, [messages]);

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch("/api/chat/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedMessage = data.message;
        // Directly patch the single message in local state — no full re-fetch
        // This avoids the race condition where background polling overwrites the update
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, reactions: updatedMessage.reactions || [] }
              : msg
          )
        );
      }
    } catch (err) {
      console.error("Toggle reaction error:", err);
    }
  };

  const handleExportChat = (format: "json" | "txt") => {
    if (!messages || messages.length === 0) {
      alert("No messages to export in this channel.");
      return;
    }

    let fileContent = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (format === "json") {
      fileContent = JSON.stringify(
        messages.map((m) => ({
          sender: m.senderName,
          role: m.senderRole || "Member",
          content: m.content,
          timestamp: m.createdAt,
          mentions: m.mentions || [],
          reactions: m.reactions || [],
        })),
        null,
        2
      );
      mimeType = "application/json";
      extension = "json";
    } else {
      const header = `====================================================\nCHAT EXPORT: #${selectedChannel.toUpperCase()}\nExported on: ${new Date().toLocaleString()}\nTotal Messages: ${messages.length}\n====================================================\n\n`;
      const body = messages
        .map((m) => {
          const timeStr = new Date(m.createdAt).toLocaleString([], {
            dateStyle: "short",
            timeStyle: "short",
          });
          return `[${timeStr}] ${m.senderName}${m.senderRole ? ` (${m.senderRole})` : ""}:\n  ${m.content}\n`;
        })
        .join("\n");
      fileContent = header + body;
      mimeType = "text/plain";
      extension = "txt";
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_export_${selectedChannel}_${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessageText(value);

    const cursorPos = e.target.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.substring(lastAtPos + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query.toLowerCase());
        setMentionIndex(lastAtPos);
        setShowMentionPopup(true);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  const handleTriggerMention = () => {
    const updatedText = newMessageText + (newMessageText.endsWith(" ") || !newMessageText ? "@" : " @");
    setNewMessageText(updatedText);
    setMentionSearch("");
    setMentionIndex(updatedText.lastIndexOf("@"));
    setShowMentionPopup(true);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const insertMention = (name: string) => {
    if (mentionIndex === -1) return;
    const beforeAt = newMessageText.substring(0, mentionIndex);
    const updatedText = `${beforeAt}@${name} `;
    setNewMessageText(updatedText);
    setShowMentionPopup(false);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const filteredMentions = [
    { _id: "everyone", name: "everyone", role: "Broadcast", email: "All channel members", isEveryone: true },
    ...teamMembers,
  ].filter((member) => {
    const name = member.name || "";
    const email = member.email || "";
    return name.toLowerCase().includes(mentionSearch) || email.toLowerCase().includes(mentionSearch);
  });

  const renderFormattedContent = (content: string, msgMentions?: string[]) => {
    if (!content) return null;

    const targets = Array.from(
      new Set([
        "everyone",
        ...teamMembers.map((tm: any) => tm.name),
        ...(msgMentions || []),
      ])
    )
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const escapedTargets = targets.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regexPattern = new RegExp(`(@(?:${escapedTargets.join("|")})|@[A-Za-z0-9_.-]+)`, "gi");

    const parts = content.split(regexPattern);

    return parts.map((part, idx) => {
      if (part && part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-0.5 font-bold text-primary bg-primary/15 dark:bg-primary/25 px-1.5 py-0.5 rounded border border-primary/30 text-xs mx-0.5"
          >
            <i className="fa-solid fa-at text-[10px]" />
            {part.substring(1)}
          </span>
        );
      }
      return part;
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && pendingAttachments.length === 0) return;

    const mentions: string[] = [];
    const allTargets = Array.from(
      new Set(["everyone", ...teamMembers.map((tm: any) => tm.name)])
    ).sort((a, b) => b.length - a.length);

    allTargets.forEach((target) => {
      const regex = new RegExp(`@${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (regex.test(newMessageText)) {
        mentions.push(target);
      }
    });

    const isDMChannel = selectedChannel.startsWith("dm_");
    let recipientId = undefined;
    if (isDMChannel) {
      const getDMChannel = (targetUser: any) => {
        const myId = user?._id || user?.name || "";
        const targetId = targetUser._id || targetUser.name || "";
        const myKey = myId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
        const targetKey = targetId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
        const pairKey = [myKey, targetKey].sort().join("_");
        return `dm_${pairKey}`;
      };
      const targetUser = teamMembers.find((m: any) => getDMChannel(m) === selectedChannel || (m.name && selectedChannel.includes(m.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
      if (targetUser) {
        recipientId = targetUser._id;
      }
    }

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          content: newMessageText,
          isDM: isDMChannel,
          recipientId,
          parentId: replyingToMsg?._id,
          mentions,
          attachments: pendingAttachments,
        }),
      });

      if (res.ok) {
        setNewMessageText("");
        setPendingAttachments([]);
        setReplyingToMsg(null);
        setShowMentionPopup(false);
        isUserNearBottomRef.current = true;
        fetchMessages(selectedChannel);
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) return;

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
      }
    } catch (err) {
      console.error("Create announcement error:", err);
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

  const selectedWaThread = waThreads.find((w) => w.id === selectedWaId);

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <i className="fa-solid fa-comments text-primary" /> Communication Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Unified real-time chat, Mail Center, WhatsApp Business API threads, Video Conferencing, Announcements, and Notification Preferences.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "chat"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-comments text-sm" /> Workspace Chat
        </button>

        {(can("viewMailCenter") || can("sendEmails") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("mail")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "mail"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-envelope text-sm" /> Mail Center
          </button>
        )}

        {(can("viewWhatsAppPanel") || can("sendWhatsAppMessages") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "whatsapp"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-brands fa-whatsapp text-sm text-emerald-500" /> WhatsApp Panel
          </button>
        )}

        {(can("startVirtualHuddles") || can("joinVirtualHuddles") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("video")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "video"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-video text-sm text-indigo-500" /> Virtual Huddle / Video
          </button>
        )}

        {(can("viewAnnouncements") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("announcements")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
              activeTab === "announcements"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-bullhorn text-sm text-amber-500" /> Announcements
          </button>
        )}

        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "settings"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-sliders text-sm text-slate-400" /> Notification Controls
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WORKSPACE CHAT (Direct Messages & Channels, Threads, @mentions)   */}
      {/* ========================================================================= */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-220px)] min-h-[520px] max-h-[720px]">
          {/* Channels & DMs Sidebar */}
          <Card className="p-4 space-y-4 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-hashtag text-xs text-primary" /> Channels
                  </h3>
                  {(can("createChatChannels") || isAdmin || isOPS) && (
                    <button
                      onClick={() => setShowCreateChannelModal(true)}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      title="Create Channel"
                    >
                      <i className="fa-solid fa-plus text-[9px]" /> New
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-[140px] overflow-y-auto no-scrollbar">
                  {(() => {
                    const activeChannels = channelsList.length > 0
                      ? channelsList.filter((ch: any) => ch.isActive !== false)
                      : [
                          { name: "general", _id: "c1", isPinned: true, isActive: true },
                          { name: "projects", _id: "c2", isPinned: true, isActive: true },
                          { name: "engineering", _id: "c3", isPinned: false, isActive: true },
                          { name: "random", _id: "c4", isPinned: false, isActive: true },
                        ];

                    return activeChannels.map((chObj: any) => {
                      const chName = typeof chObj === "string" ? chObj : chObj.name;
                      const chId = typeof chObj === "string" ? chObj : chObj._id;
                      const isPinned = typeof chObj === "string" ? false : Boolean(chObj.isPinned);
                      const isSelected = selectedChannel === chName;
                      const isManagerOrAdmin = user?.role === "Admin" || user?.role === "Manager";

                      return (
                        <div
                          key={chId || chName}
                          className={cn(
                            "group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                          onClick={() => setSelectedChannel(chName)}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <i className={`fa-solid ${isPinned ? "fa-thumbtack text-amber-400 text-[10px]" : "fa-hashtag text-xs"}`} /> 
                            {chName}
                          </span>

                          {isManagerOrAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePinChannel(chId, isPinned);
                                }}
                                className="p-1 text-[10px] hover:text-amber-400 transition-colors"
                                title={isPinned ? "Unpin Channel" : "Pin Channel"}
                              >
                                <i className="fa-solid fa-thumbtack" />
                              </button>

                              {chName !== "general" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChannel(chId, chName);
                                  }}
                                  className="p-1 text-[10px] hover:text-rose-400 transition-colors"
                                  title="Deactivate Channel"
                                >
                                  <i className="fa-solid fa-trash-can" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Inactive Channels Section (Admin & Manager view) */}
                {(user?.role === "Admin" || user?.role === "Manager") && (
                  <div className="mt-3 pt-2 border-t border-border/60">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5 flex items-center gap-1">
                      <i className="fa-solid fa-box-archive text-[9px] text-amber-500" /> Inactive Channels
                    </h4>
                    {channelsList.filter((ch: any) => ch.isActive === false).length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50 italic px-1">No inactive channels</p>
                    ) : (
                      <div className="space-y-1 max-h-[90px] overflow-y-auto no-scrollbar">
                        {channelsList
                          .filter((ch: any) => ch.isActive === false)
                          .map((inCh: any) => (
                            <div
                              key={inCh._id}
                              className="group flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                              <span className="flex items-center gap-1.5 truncate line-through">
                                <i className="fa-solid fa-hashtag text-[10px] opacity-40" />
                                {inCh.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReactivateChannel(inCh._id)}
                                  className="text-[10px] text-emerald-500 hover:text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                  title="Reactivate Channel"
                                >
                                  <i className="fa-solid fa-rotate-left text-[9px]" /> Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChannel(inCh._id, inCh.name)}
                                  className="text-[10px] text-rose-400 hover:text-rose-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                  title="Permanently Delete Channel"
                                >
                                  <i className="fa-solid fa-trash-can text-[9px]" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-user-group text-xs text-emerald-500" /> Direct Messages
                </h3>
                <div className="space-y-1">
                  {(() => {
                    const getDMChannel = (targetUser: any) => {
                      const myId = user?._id || user?.name || "";
                      const targetId = targetUser._id || targetUser.name || "";
                      const myKey = myId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                      const targetKey = targetId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                      const pairKey = [myKey, targetKey].sort().join("_");
                      return `dm_${pairKey}`;
                    };

                    const sourceList = teamMembers.length > 0
                      ? teamMembers
                      : [
                          { name: "Admin NEX 2", role: "Admin", _id: "admin_nex_2", status: "Active" },
                          { name: "Ashu", role: "HR", _id: "ashu", status: "Active" },
                          { name: "Sarah Jenkins", role: "Product Designer", _id: "u1", status: "Active" },
                          { name: "Alex Rivera", role: "Frontend Dev", _id: "u2", status: "Active" },
                          { name: "David Kim", role: "Operations Lead", _id: "u3", status: "Offline" },
                        ];

                    const dmUsers = sourceList.filter((m: any) => {
                      const isSelf = (m._id && user?._id && m._id === user._id) || (m.name && user?.name && m.name === user.name);
                      return !isSelf;
                    });

                    // Sort DM users by recent conversation activity & unread messages
                    const sortedDmUsers = [...dmUsers].sort((a, b) => {
                      const channelA = getDMChannel(a);
                      const channelB = getDMChannel(b);
                      const convA = recentConversations.find((c: any) => c._id === channelA || (a.name && c._id.includes(a.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                      const convB = recentConversations.find((c: any) => c._id === channelB || (b.name && c._id.includes(b.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                      const timeA = convA?.lastMessageAt ? new Date(convA.lastMessageAt).getTime() : 0;
                      const timeB = convB?.lastMessageAt ? new Date(convB.lastMessageAt).getTime() : 0;
                      return timeB - timeA;
                    });

                    return sortedDmUsers.map((mUser: any, idx: number) => {
                      const dmChannel = getDMChannel(mUser);
                      const isOnline = mUser.status ? mUser.status === "Active" : idx % 2 === 0;
                      const conv = recentConversations.find((c: any) => c._id === dmChannel || (mUser.name && c._id.includes(mUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                      const unreadCount = conv?.unreadCount || 0;

                      return (
                        <button
                          key={mUser._id || mUser.name}
                          onClick={() => setSelectedChannel(dmChannel)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left",
                            selectedChannel === dmChannel
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : unreadCount > 0
                              ? "bg-rose-500/10 text-foreground font-semibold border border-rose-500/20"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <i className="fa-solid fa-circle-user text-sm" />
                            <span className="truncate">{mUser.name || mUser.email}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unreadCount > 0 && selectedChannel !== dmChannel && (
                              <Badge className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.2 animate-pulse border-0">
                                {unreadCount} new
                              </Badge>
                            )}
                            <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                              {isOnline ? (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </>
                              ) : (
                                <>
                                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-slate-400/40 opacity-50" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500 opacity-70" />
                                </>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/80 bg-muted/20 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <i className="fa-solid fa-circle-info text-primary" /> Pro-Tip
              </p>
              <p>Type <code className="text-primary font-mono bg-primary/10 px-1 rounded">@username</code> to mention teammates in chat messages.</p>
            </div>
          </Card>

          {/* Chat Feed */}
          <Card className="md:col-span-3 p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border font-semibold text-foreground text-sm">
              <div className="flex items-center gap-2">
                <i className={selectedChannel.startsWith("dm_") ? "fa-solid fa-user-group text-emerald-500" : "fa-solid fa-hashtag text-primary"} />
                <span className="capitalize">
                  {selectedChannel.startsWith("dm_")
                    ? (() => {
                        const getDMChannel = (targetUser: any) => {
                          const myId = user?._id || user?.name || "";
                          const targetId = targetUser._id || targetUser.name || "";
                          const myKey = myId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                          const targetKey = targetId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                          const pairKey = [myKey, targetKey].sort().join("_");
                          return `dm_${pairKey}`;
                        };
                        const target = teamMembers.find((m: any) => getDMChannel(m) === selectedChannel || (m.name && selectedChannel.includes(m.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                        return target ? target.name : selectedChannel.replace("dm_", "").replace(/_/g, " ");
                      })()
                    : selectedChannel}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono tracking-wider px-2 py-0.5 inline-flex items-center gap-1 border-primary/30 bg-primary/10 text-primary dark:text-blue-300 font-semibold rounded-md">
                  {selectedChannel.startsWith("dm_") ? "DIRECT MESSAGE" : "PUBLIC CHANNEL"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                {/* Export Chat Controls */}
                {messages && messages.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/60">
                    <span className="text-[10px] font-semibold text-muted-foreground px-1.5 flex items-center gap-1">
                      <i className="fa-solid fa-file-arrow-down text-primary" /> Export:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportChat("txt")}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-background hover:bg-accent text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Export as Text Transcript (.txt)"
                    >
                      <i className="fa-solid fa-file-lines text-slate-500" /> TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportChat("json")}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-background hover:bg-accent text-foreground border border-border/60 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Export as Structured JSON (.json)"
                    >
                      <i className="fa-solid fa-code text-indigo-500" /> JSON
                    </button>
                  </div>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-signal text-emerald-500 text-[10px]" /> Realtime Sync
                </span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div 
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              onClick={() => setSelectedMsgId(null)}
              className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar cursor-default"
            >
              {loadingChat ? (
                <div className="text-center text-xs text-muted-foreground py-12 space-y-2">
                  <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
                  <p>Syncing channel history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-16 space-y-2">
                  <i className="fa-solid fa-comments text-3xl opacity-40 text-primary" />
                  <p className="font-medium">
                    No messages in{" "}
                    {selectedChannel.startsWith("dm_")
                      ? (() => {
                          const getDMChannel = (targetUser: any) => {
                            const myId = user?._id || user?.name || "";
                            const targetId = targetUser._id || targetUser.name || "";
                            const myKey = myId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                            const targetKey = targetId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                            const pairKey = [myKey, targetKey].sort().join("_");
                            return `dm_${pairKey}`;
                          };
                          const target = teamMembers.find((m: any) => getDMChannel(m) === selectedChannel || (m.name && selectedChannel.includes(m.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                          return target ? target.name : selectedChannel.replace("dm_", "").replace(/_/g, " ");
                        })()
                      : `#${selectedChannel}`}{" "}
                    yet.
                  </p>
                  <p className="text-[11px]">Start the conversation below!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  if (
                    (user?.name && m.deletedForUsers?.includes(user.name)) ||
                    (user?._id && m.deletedForUsers?.includes(user._id))
                  ) {
                    return null;
                  }

                  const isSelected = selectedMsgId === m._id;
                  const messageDate = new Date(m.createdAt);
                  const prevMessageDate = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
                  
                  const isDifferentDay = !prevMessageDate || 
                    messageDate.toDateString() !== prevMessageDate.toDateString();

                  const getDateSeparatorLabel = (date: Date) => {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);

                    if (date.toDateString() === today.toDateString()) {
                      return "Today";
                    } else if (date.toDateString() === yesterday.toDateString()) {
                      return "Yesterday";
                    } else {
                      return date.toLocaleDateString(undefined, { 
                        weekday: "long", 
                        month: "short", 
                        day: "numeric", 
                        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined 
                      });
                    }
                  };

                  const reactionColorMap: Record<string, string> = {
                    "fa-thumbs-up": "text-primary",
                    "fa-heart": "text-rose-500",
                    "fa-fire": "text-amber-500",
                    "fa-rocket": "text-indigo-500",
                    "fa-face-smile": "text-yellow-500",
                    "fa-hands-clapping": "text-emerald-500",
                  };
                  return (
                    <React.Fragment key={m._id}>
                      {/* Date Separator Divider */}
                      {isDifferentDay && (
                        <div className="relative flex items-center justify-center my-6">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/80 dark:border-slate-800" />
                          </div>
                          <div className="relative bg-card dark:bg-slate-900 px-3 py-1 rounded-full border border-border/80 dark:border-slate-800 shadow-xs text-[11px] font-semibold text-muted-foreground">
                            {getDateSeparatorLabel(messageDate)}
                          </div>
                        </div>
                      )}
                      <div className="group" onClick={(e) => e.stopPropagation()}>
                        {/* Chat Bubble Row: Avatar + Bubble */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase flex-shrink-0 mt-0.5 border border-primary/20">
                            {m.senderName.charAt(0)}
                          </div>

                          {/* Bubble */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "rounded-2xl rounded-tl-sm px-4 py-2.5 border transition-colors duration-150 cursor-pointer relative",
                                isSelected
                                  ? "bg-slate-100 border-primary/50 shadow-md dark:bg-[hsl(215,30%,22%)]"
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-[hsl(215,30%,20%)] dark:border-[hsl(215,25%,25%)] dark:hover:bg-[hsl(215,30%,22%)]"
                              )}
                              onClick={() => setSelectedMsgId(isSelected ? null : m._id)}
                            >
                              {/* Name + Role + Reply for Public Channels */}
                              {!selectedChannel.startsWith("dm_") && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm text-foreground">{m.senderName}</span>
                                  {m.senderRole && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                      {m.senderRole}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReplyingToMsg(m); }}
                                    className="ml-auto text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <i className="fa-solid fa-reply text-[9px]" />
                                  </button>
                                </div>
                              )}

                              {/* Reply button for DMs (absolute positioned on hover, 0 flow height) */}
                              {selectedChannel.startsWith("dm_") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setReplyingToMsg(m); }}
                                  className="absolute top-1.5 right-2 text-[10px] text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                                  title="Reply"
                                >
                                  <i className="fa-solid fa-reply text-[9px]" />
                                </button>
                              )}

                              {/* Thread Indicator */}
                              {m.parentId && (
                                <div className="text-[11px] text-muted-foreground bg-background/50 p-1.5 rounded border-l-2 border-l-primary flex items-center gap-1.5 mb-2">
                                  <i className="fa-solid fa-quote-left text-[9px] text-primary" /> Replying to thread
                                </div>
                              )}

                              {/* Message Body */}
                              <div className="flex items-end gap-2">
                                {m.deletedForEveryone ? (
                                  <p className="text-xs text-muted-foreground/80 italic flex-1 flex items-center gap-1.5">
                                    <i className="fa-solid fa-ban text-xs text-muted-foreground/60" /> This message was deleted
                                  </p>
                                ) : (
                                  <div className="flex-1 space-y-2">
                                    {m.content && !m.content.startsWith("[Attachment]") && (
                                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                        {renderFormattedContent(m.content, m.mentions)}
                                      </p>
                                    )}

                                    {/* Message Attachments List */}
                                    {m.attachments && m.attachments.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {m.attachments.map((att, attIdx) => {
                                          const isImg = att.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
                                          const attUrl = att.url.includes("fileId") || att.url.includes("id=") ? att.url : `/api/drive/download?fileId=${(att as any)._id || att.url.split("=").pop()}`;
                                          return (
                                            <div
                                              key={attIdx}
                                              className="rounded-xl border border-border/80 bg-card/80 p-2.5 max-w-sm space-y-2 shadow-xs"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {/* Image Thumbnail */}
                                              {isImg && (
                                                <div
                                                  className="overflow-hidden rounded-lg border border-border/60 bg-black/20 cursor-pointer group/img relative"
                                                  onClick={() => setPreviewImageModal({ url: attUrl, name: att.name, size: att.size })}
                                                >
                                                  <img
                                                    src={attUrl}
                                                    alt={att.name}
                                                    className="w-full max-h-52 object-cover group-hover/img:scale-105 transition-transform duration-200"
                                                    onError={(e) => {
                                                      // Hide broken img tag if URL fails
                                                      (e.target as HTMLElement).style.display = "none";
                                                    }}
                                                  />
                                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-xs gap-1.5">
                                                    <i className="fa-solid fa-magnifying-glass-plus text-sm" /> Preview
                                                  </div>
                                                </div>
                                              )}

                                              {/* File Meta Info */}
                                              <div className="flex items-center justify-between gap-2 text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                                                    <i className={cn("fa-solid text-sm", isImg ? "fa-file-image text-emerald-500" : "fa-file text-indigo-500")} />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="font-bold text-foreground truncate">{att.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{Math.round(att.size / 1024)} KB</p>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Action Buttons: Preview & Download */}
                                              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                                                {isImg && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewImageModal({ url: attUrl, name: att.name, size: att.size })}
                                                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                                  >
                                                    <i className="fa-solid fa-eye text-xs text-primary" /> Preview
                                                  </button>
                                                )}

                                                <a
                                                  href={attUrl}
                                                  download={att.name}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                  <i className="fa-solid fa-download text-xs" /> Download
                                                </a>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap flex-shrink-0 pb-0.5 flex items-center gap-1">
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                                  {(m.senderName === user?.name || (user?._id && (m as any).senderId === user?._id)) && (
                                    (
                                      m.read || 
                                      (m.readBy && m.readBy.length > 0) || 
                                      messages.slice(idx + 1).some((futureMsg) => futureMsg.senderName !== m.senderName)
                                    ) ? (
                                      <i className="fa-solid fa-check-double text-xs text-sky-400 font-bold" title="Read by recipient" />
                                    ) : (
                                      <i className="fa-solid fa-check text-xs text-muted-foreground/70 font-semibold" title="Sent (Unread)" />
                                    )
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Reaction Badges */}
                            {m.reactions && m.reactions.length > 0 && (
                              <div className="flex items-center flex-wrap gap-1.5 mt-2 pl-1">
                                {m.reactions.map((r, rIdx) => {
                                  const iconColor = REACTION_COLOR_MAP[r.emoji] || "text-primary";
                                  return (
                                    <button
                                      key={rIdx}
                                      type="button"
                                      onClick={() => setActiveReactionModal({ messageId: m._id, emoji: r.emoji, users: r.users })}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 shadow-sm hover:bg-slate-200 dark:bg-[hsl(215,30%,20%)] dark:border-[hsl(215,25%,25%)] dark:hover:bg-[hsl(215,30%,24%)] cursor-pointer transition-colors"
                                      title="Click to view members who reacted"
                                    >
                                      <i className={cn("fa-solid text-sm", r.emoji, iconColor)} />
                                      <span className="text-xs font-bold text-foreground">{r.users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Selection Toolbar: Reactions + Read Info + Forward + Delete Options */}
                            {isSelected && (
                              <div className="flex items-center flex-wrap gap-2 mt-2 pl-1 animate-in fade-in">
                                <div className="inline-flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-2.5 py-1 shadow-md dark:bg-[hsl(215,30%,20%)] dark:border-[hsl(215,25%,25%)]">
                                  {[
                                    { icon: "fa-thumbs-up",     label: "Like",   color: "text-primary" },
                                    { icon: "fa-heart",          label: "Love",   color: "text-rose-500" },
                                    { icon: "fa-fire",           label: "Fire",   color: "text-amber-500" },
                                    { icon: "fa-rocket",         label: "Rocket", color: "text-indigo-500" },
                                    { icon: "fa-face-smile",     label: "Smile",  color: "text-yellow-500" },
                                    { icon: "fa-hands-clapping", label: "Clap",   color: "text-emerald-500" },
                                  ].map((item) => (
                                    <button
                                      key={item.icon}
                                      onClick={() => { handleToggleReaction(m._id, item.icon); setSelectedMsgId(null); }}
                                      className="h-6 w-6 rounded-full hover:bg-background hover:scale-125 flex items-center justify-center transition-all duration-150 cursor-pointer"
                                      title={item.label}
                                    >
                                      <i className={cn("fa-solid text-xs", item.icon, item.color)} />
                                    </button>
                                  ))}
                                </div>

                                <div className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1 shadow-md text-xs font-medium">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setReadInfoMsg(m); }}
                                    className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Read details"
                                  >
                                    <i className="fa-solid fa-circle-info text-primary text-xs" /> Read Info
                                  </button>

                                  <span className="text-border">|</span>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setForwardMsg(m); setForwardTargetChannel(selectedChannel); }}
                                    className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Forward message"
                                  >
                                    <i className="fa-solid fa-share text-indigo-500 text-xs" /> Forward
                                  </button>

                                  <span className="text-border">|</span>

                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ msgId: m._id, deleteMode: "me", content: m.content }); }}
                                    className="hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Delete for Me"
                                  >
                                    <i className="fa-solid fa-trash-can text-amber-500 text-xs" /> Delete for Me
                                  </button>

                                  {(m.senderName === user?.name || (user?._id && (m as any).senderId === user?._id) || user?.role === "Admin" || user?.role === "Manager") && !m.deletedForEveryone && (
                                    <>
                                      <span className="text-border">|</span>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ msgId: m._id, deleteMode: "everyone", content: m.content }); }}
                                        className="text-rose-500 hover:text-rose-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Delete for Everyone"
                                      >
                                        <i className="fa-solid fa-ban text-xs text-rose-500" /> Delete for Everyone
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Context Bar */}
            {replyingToMsg && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border-t border-border text-xs rounded-t-md">
                <span className="text-primary font-medium flex items-center gap-1.5">
                  <i className="fa-solid fa-reply text-xs" /> Replying to thread from <strong>{replyingToMsg.senderName}</strong>
                </span>
                <button onClick={() => setReplyingToMsg(null)} className="text-muted-foreground hover:text-foreground">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            )}

            {/* Send Message Form */}
            <div className="relative pt-3 border-t border-border">
              {/* Mention Autocomplete Popup */}
              {showMentionPopup && (
                <div className="absolute bottom-full mb-2 left-0 w-72 max-h-56 overflow-y-auto bg-card border border-border shadow-xl rounded-xl p-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/50">
                    <span className="flex items-center gap-1.5 text-primary font-bold">
                      <i className="fa-solid fa-at text-xs" /> Mention Team Member
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">{filteredMentions.length} matches</span>
                  </div>
                  {filteredMentions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                      No matching members found
                    </div>
                  ) : (
                    <div className="py-1 space-y-0.5">
                      {filteredMentions.map((member) => (
                        <button
                          key={member._id || member.name}
                          type="button"
                          onClick={() => insertMention(member.name)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-primary/10 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] uppercase flex-shrink-0">
                              {member.isEveryone ? <i className="fa-solid fa-bullhorn text-[10px]" /> : member.name.charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                @{member.name}
                              </p>
                              {member.email && (
                                <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                              )}
                            </div>
                          </div>
                          {member.role && (
                            <span className="text-[9px] font-semibold bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground flex-shrink-0 ml-2">
                              {member.role}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pending Attachments Chip Bar with Image Thumbnail Previews */}
              {(pendingAttachments.length > 0 || uploadingFile) && (
                <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-muted/30 border border-border/60 rounded-lg">
                  {pendingAttachments.map((att, idx) => {
                    const isImg = att.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name);
                    return (
                      <div key={idx} className="relative group/chip inline-flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-card border border-border shadow-xs text-xs font-semibold text-foreground">
                        {isImg ? (
                          <img src={att.url} alt={att.name} className="h-10 w-10 rounded-md object-cover border border-border/60" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <i className="fa-solid fa-file-image text-base" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate max-w-[130px] font-bold text-foreground">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{Math.round(att.size / 1024)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="h-5 w-5 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-colors flex items-center justify-center ml-1 cursor-pointer"
                          title="Remove image"
                        >
                          <i className="fa-solid fa-xmark text-[10px]" />
                        </button>
                      </div>
                    );
                  })}
                  {uploadingFile && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground animate-pulse font-medium">
                      <i className="fa-solid fa-spinner fa-spin text-primary text-sm" /> Uploading image preview...
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileAttachmentSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex items-center justify-center cursor-pointer flex-shrink-0"
                  title="Attach Image (Max 10MB)"
                >
                  {uploadingFile ? (
                    <i className="fa-solid fa-spinner fa-spin text-xs text-primary" />
                  ) : (
                    <i className="fa-solid fa-paperclip text-xs" />
                  )}
                </button>

                <div className="relative flex-1">
                  <Input
                    ref={chatInputRef}
                    type="text"
                    placeholder={`Message ${
                      selectedChannel.startsWith("dm_")
                        ? (() => {
                            const getDMChannel = (targetUser: any) => {
                              const myId = user?._id || user?.name || "";
                              const targetId = targetUser._id || targetUser.name || "";
                              const myKey = myId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                              const targetKey = targetId.toString().toLowerCase().replace(/[^a-z0-9]/g, "_");
                              const pairKey = [myKey, targetKey].sort().join("_");
                              return `dm_${pairKey}`;
                            };
                            const target = teamMembers.find((m: any) => getDMChannel(m) === selectedChannel || (m.name && selectedChannel.includes(m.name.toLowerCase().replace(/[^a-z0-9]/g, "_"))));
                            return target ? target.name : selectedChannel.replace("dm_", "").replace(/_/g, " ");
                          })()
                        : `#${selectedChannel}`
                    }... (Type @ to mention)`}
                    value={newMessageText}
                    onChange={handleChatInputChange}
                    className="text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={handleTriggerMention}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1 text-xs cursor-pointer"
                    title="Mention someone"
                  >
                    <i className="fa-solid fa-at" />
                  </button>
                </div>
                <Button color="primary" type="submit" disabled={uploadingFile} className="gap-2 font-semibold">
                  <i className="fa-solid fa-paper-plane text-xs" /> Send
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MAIL CENTER (Inbox, Sent, Starred, Compose Modal)                 */}
      {/* ========================================================================= */}
      {activeTab === "mail" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMailFilter("inbox")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer",
                  mailFilter === "inbox" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-inbox text-xs" /> Inbox
              </button>
              <button
                onClick={() => setMailFilter("sent")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer",
                  mailFilter === "sent" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-paper-plane text-xs" /> Sent Items
              </button>
            </div>

            <Button color="primary" size="sm" onClick={() => setShowComposeMail(true)} className="gap-2 font-semibold">
              <i className="fa-solid fa-pen-to-square text-xs" /> Compose Email
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[520px]">
            {/* Mail List */}
            <Card className="p-3 space-y-2 overflow-y-auto no-scrollbar">
              <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 pb-1 border-b border-border">
                {mailFilter === "inbox" ? "Inbox Messages" : "Sent Messages"}
              </h3>
              {mails
                .filter((m) => (mailFilter === "inbox" ? m.folder === "inbox" : m.folder === "sent"))
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMailId(m.id)}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer space-y-1",
                      selectedMailId === m.id
                        ? "bg-primary/10 border-primary shadow-2xs"
                        : "bg-card border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground truncate">{m.sender}</span>
                      <span className="text-[10px] text-muted-foreground">{m.date}</span>
                    </div>
                    <p className="font-semibold text-xs text-foreground truncate">{m.subject}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{m.preview}</p>
                  </div>
                ))}
            </Card>

            {/* Mail Detail Pane */}
            <Card className="md:col-span-2 p-6 flex flex-col justify-between">
              {selectedMail ? (
                <div className="space-y-4">
                  <div className="border-b border-border pb-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h2 className="text-base font-bold text-foreground">{selectedMail.subject}</h2>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {selectedMail.email}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">From: <span className="font-semibold text-foreground">{selectedMail.sender}</span></p>
                  </div>

                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-line py-2">
                    {selectedMail.body}
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-muted-foreground text-xs space-y-2">
                  <i className="fa-solid fa-envelope-open text-3xl opacity-40 text-primary" />
                  <p>Select an email from the left to read conversation thread.</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs cursor-pointer"
                  onClick={() => {
                    if (selectedMail) {
                      setComposeTo(selectedMail.email);
                      setComposeSubject(`Re: ${selectedMail.subject}`);
                      setComposeBody(`\n\n--- Original Message ---\nFrom: ${selectedMail.sender} (${selectedMail.email})\n${selectedMail.body}`);
                      setShowComposeMail(true);
                    }
                  }}
                >
                  <i className="fa-solid fa-reply text-xs" /> Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs cursor-pointer"
                  onClick={() => {
                    if (selectedMail) {
                      setComposeTo("");
                      setComposeSubject(`Fwd: ${selectedMail.subject}`);
                      setComposeBody(`\n\n--- Forwarded Message ---\nFrom: ${selectedMail.sender} (${selectedMail.email})\n${selectedMail.body}`);
                      setShowComposeMail(true);
                    }
                  }}
                >
                  <i className="fa-solid fa-share text-xs" /> Forward
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WHATSAPP BUSINESS PANEL (Client & Team WhatsApp Threads)          */}
      {/* ========================================================================= */}
      {activeTab === "whatsapp" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[550px]">
          {/* Threads List */}
          <Card className="p-4 space-y-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-emerald-500 text-sm" /> WhatsApp API Threads
              </h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Live API Connected
              </Badge>
            </div>

            <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
              {waThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedWaId(thread.id)}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer space-y-1.5",
                    selectedWaId === thread.id
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-2xs"
                      : "bg-card border-border hover:bg-muted/30"
                  )}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground">{thread.contactName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{thread.time}</span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{thread.phone}</p>
                  <p className="text-xs text-foreground/80 truncate">{thread.lastMessage}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Thread Chat */}
          <Card className="md:col-span-2 p-4 flex flex-col justify-between">
            {selectedWaThread ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <i className="fa-brands fa-whatsapp text-emerald-500" /> {selectedWaThread.contactName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedWaThread.phone}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500">
                    {selectedWaThread.status} Session
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
                  {selectedWaThread.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "max-w-[75%] p-3 rounded-xl text-xs space-y-1",
                        msg.sender === "agent"
                          ? "ml-auto bg-emerald-600 text-white rounded-br-none shadow-2xs"
                          : "mr-auto bg-muted/60 text-foreground rounded-bl-none border border-border/80"
                      )}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[9px] opacity-75 block text-right font-mono flex items-center justify-end gap-1">
                        {msg.time}
                        {msg.sender === "agent" && (
                          (msg as any).read ? (
                            <i className="fa-solid fa-check-double text-[11px] text-sky-300 font-bold" title="Read by user" />
                          ) : (
                            <i className="fa-solid fa-check text-[11px] opacity-80" title="Sent (Unread)" />
                          )
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendWaReply} className="flex gap-2 pt-3 border-t border-border">
                  <Input
                    type="text"
                    placeholder="Reply via WhatsApp Business API..."
                    value={waReplyText}
                    onChange={(e) => setWaReplyText(e.target.value)}
                    className="text-xs"
                  />
                  <Button color="primary" type="submit" className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white">
                    <i className="fa-solid fa-paper-plane text-xs" /> Reply
                  </Button>
                </form>
              </>
            ) : (
              <div className="py-24 text-center text-muted-foreground text-xs">Select a WhatsApp thread.</div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VIRTUAL OFFICE / VIDEO CONFERENCING HUDDLE                         */}
      {/* ========================================================================= */}
      {activeTab === "video" && (
        <Card className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-video text-indigo-500" /> Virtual Huddle & Project Video Room
              </h2>
              <p className="text-xs text-muted-foreground">High-definition audio/video calls directly tied to active projects and team channels.</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
              WebRTC Room Active
            </Badge>
          </div>

          {!inCall ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-users-viewfinder text-2xl" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Launch Video Meeting</h3>
                <p className="text-xs text-muted-foreground">Start an instant huddle room for project standups or client reviews.</p>
              </div>

              <div className="space-y-3 pt-2">
                <Input
                  value={callRoomName}
                  onChange={(e) => setCallRoomName(e.target.value)}
                  placeholder="Enter Video Room Title"
                  className="text-xs text-center"
                />
                <Button color="primary" onClick={() => setInCall(true)} className="w-full gap-2 font-semibold bg-indigo-600 hover:bg-indigo-700">
                  <i className="fa-solid fa-video text-xs" /> Join Video Room
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Video View Canvas */}
              <div className="relative aspect-video w-full bg-slate-950 rounded-xl border border-indigo-500/30 overflow-hidden flex items-center justify-center shadow-2xl">
                {!camOff ? (
                  <div className="text-center text-slate-400 space-y-2">
                    <i className="fa-solid fa-circle-user text-6xl text-indigo-400 animate-pulse block" />
                    <p className="text-xs font-semibold text-white">{callRoomName} • Connected</p>
                    <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-400">
                      720p HD Stream Active
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 space-y-1">
                    <i className="fa-solid fa-video-slash text-4xl block" />
                    <p className="text-xs">Camera Turned Off</p>
                  </div>
                )}

                {/* Participant Thumbnails */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <div className="w-24 h-16 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-300 font-semibold shadow-md">
                    Sarah J.
                  </div>
                  <div className="w-24 h-16 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-300 font-semibold shadow-md">
                    Alex R.
                  </div>
                </div>
              </div>

              {/* Call Control Toolbar */}
              <div className="flex justify-center items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border">
                <Button
                  color={micMuted ? "destructive" : "default"}
                  variant={micMuted ? "default" : "outline"}
                  size="icon"
                  onClick={() => setMicMuted(!micMuted)}
                  title={micMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  <i className={cn("fa-solid text-xs", micMuted ? "fa-microphone-slash" : "fa-microphone")} />
                </Button>

                <Button
                  color={camOff ? "destructive" : "default"}
                  variant={camOff ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCamOff(!camOff)}
                  title={camOff ? "Turn Cam On" : "Turn Cam Off"}
                >
                  <i className={cn("fa-solid text-xs", camOff ? "fa-video-slash" : "fa-video")} />
                </Button>

                <Button
                  variant={screenSharing ? "default" : "outline"}
                  size="icon"
                  onClick={() => setScreenSharing(!screenSharing)}
                  title="Share Screen"
                >
                  <i className="fa-solid fa-desktop text-xs" />
                </Button>

                <Button color="destructive" size="sm" onClick={() => setInCall(false)} className="gap-2 font-semibold">
                  <i className="fa-solid fa-phone-slash text-xs" /> Leave Call
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ANNOUNCEMENTS BOARD (Company Updates, Pinned Announcements)        */}
      {/* ========================================================================= */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500" /> Company Announcements Board
              </h2>
              <p className="text-xs text-muted-foreground">Official team updates and pinned policy notices, distinct from general chat noise.</p>
            </div>
            {(can("createAnnouncements") || isAdmin || isOPS) && (
              <Button color="primary" size="sm" onClick={() => setShowAnnModal(true)} className="gap-2 font-semibold bg-amber-600 hover:bg-amber-700 border-none">
                <i className="fa-solid fa-plus text-xs" /> Post Announcement
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <Card key={ann._id} className={cn("p-5 space-y-3 transition-all", ann.pinned ? "border-amber-500/50 bg-amber-500/5 shadow-2xs" : "bg-card")}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {ann.pinned && (
                        <Badge color="warning" variant="outline" className="text-[9px] bg-amber-500/20 text-amber-500 border-amber-500/30 flex items-center gap-1">
                          <i className="fa-solid fa-thumbtack text-[9px]" /> Pinned
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px]">
                        {ann.category}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-foreground/80 leading-relaxed">{ann.content}</p>

                <div className="text-[10px] text-muted-foreground pt-2 border-t border-border flex justify-between items-center">
                  <span>By <strong className="text-foreground">{ann.authorName}</strong></span>
                  <span className="flex items-center gap-1 text-primary">
                    <i className="fa-solid fa-eye text-[10px]" /> Published to Tenant
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTIFICATION PREFERENCES PER MODULE                                 */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <Card className="p-6 space-y-6 max-w-2xl">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-sliders text-primary" /> Notification Preferences per Module
            </h2>
            <p className="text-xs text-muted-foreground">Control notification alerts independently so chat pings and HR approvals don't compete for attention.</p>
          </div>

          <div className="space-y-4 text-xs">
            {[
              { key: "chatPings", label: "Workspace Chat @Mentions & Direct Messages", desc: "Receive immediate popups and sound chimes for direct pings", module: "chat" },
              { key: "mailAlerts", label: "Mail Center Inbound Emails", desc: "Alert when new client emails arrive in the CRM inbox", module: "clients" },
              { key: "hrApprovals", label: "HR Leave & Expense Approvals", desc: "Separate quiet alerts for manager approval requests", module: "hr", feature: "approveLeave" },
              { key: "announcementPins", label: "Pinned Company Announcements", desc: "Always notify on high-priority company updates", module: "chat" },
              { key: "soundEnabled", label: "Audible Notification Chimes", desc: "Play sound chime on high-priority incoming alerts" },
            ]
              .filter((pref) => {
                if (isAdmin || isOPS) return true;
                if (pref.module && !canAccessModule(pref.module)) return false;
                if (pref.feature && !can(pref.feature)) return false;
                return true;
              })
              .map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/20">
                  <div>
                    <p className="font-bold text-foreground">{pref.label}</p>
                    <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notifyPrefs as any)[pref.key]}
                    onChange={(e) => setNotifyPrefs({ ...notifyPrefs, [pref.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-primary border-input focus:ring-primary cursor-pointer"
                  />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST ANNOUNCEMENT FORM                                            */}
      {/* ========================================================================= */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowAnnModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500" /> Post Company Announcement
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAnnModal(false)}>
                <i className="fa-solid fa-xmark" />
              </Button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Announcement Title</label>
                <Input
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="e.g. Q3 Townhall Meeting & Policy Updates"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category</label>
                <select
                  value={annForm.category}
                  onChange={(e) => setAnnForm({ ...annForm, category: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none"
                >
                  <option value="Company News">Company News</option>
                  <option value="Policy Update">Policy Update</option>
                  <option value="Event">Event</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Announcement Details</label>
                <textarea
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none"
                  placeholder="Write clear company update details..."
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinnedCheck"
                  checked={annForm.pinned}
                  onChange={(e) => setAnnForm({ ...annForm, pinned: e.target.checked })}
                  className="w-4 h-4 rounded text-primary border-input cursor-pointer"
                />
                <label htmlFor="pinnedCheck" className="font-semibold text-foreground cursor-pointer">
                  Pin to Top of Announcements Board
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAnnModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold bg-amber-600 hover:bg-amber-700 text-white border-none">
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPOSE MAIL FORM                                                 */}
      {/* ========================================================================= */}
      {showComposeMail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowComposeMail(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-primary" /> Compose Email Message
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowComposeMail(false)}>
                <i className="fa-solid fa-xmark" />
              </Button>
            </div>

            <form onSubmit={handleSendMail} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">To (Recipient Email)</label>
                {teamMembers.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setComposeTo(e.target.value);
                    }}
                    value={teamMembers.some((m: any) => m.email === composeTo) ? composeTo : ""}
                    className="w-full h-9 mb-1.5 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">-- Select Teammate (or type below) --</option>
                    {teamMembers.map((member: any) => (
                      <option key={member._id || member.email} value={member.email}>
                        {member.name} ({member.email}) - {member.role || "Member"}
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="Select teammate above or type client email..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Subject Line</label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Project Scope Update & Retainer Signoff"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Email Body</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none"
                  placeholder="Write email contents..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowComposeMail(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold gap-2">
                  <i className="fa-solid fa-paper-plane text-xs" /> Send Email
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Channel Modal Dialog */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-hashtag text-primary" /> Create New Channel
              </h3>
              <button
                onClick={() => setShowCreateChannelModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {channelError && (
              <div className="p-3 text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg font-medium">
                {channelError}
              </div>
            )}

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Channel Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-mono">#</span>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="e.g. design-sync"
                    className="pl-7 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
                <Input
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What is this channel about?"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateChannelModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" disabled={isSubmittingChannel} className="font-semibold gap-2">
                  <i className={`fa-solid ${isSubmittingChannel ? "fa-spinner fa-spin" : "fa-plus"} text-xs`} />
                  {isSubmittingChannel ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Channel Confirmation Modal */}
      {channelDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <i className="fa-solid fa-triangle-exclamation text-xl" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {channelsList.find((c: any) => c._id === channelDeleteConfirm.channelId)?.isActive === false
                  ? `Permanently Delete #${channelDeleteConfirm.channelName}?`
                  : `Move #${channelDeleteConfirm.channelName} to Inactive?`}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {channelsList.find((c: any) => c._id === channelDeleteConfirm.channelId)?.isActive === false
                  ? "This channel will be permanently removed from the database for all workspace members. This action cannot be undone."
                  : "This channel will be moved to the Inactive list. Admins and Managers can restore it at any time."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChannelDeleteConfirm(null)}
                className="w-full font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmExecuteDelete}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
              >
                <i className="fa-solid fa-box-archive text-xs" />
                {channelsList.find((c: any) => c._id === channelDeleteConfirm.channelId)?.isActive === false
                  ? "Permanently Delete"
                  : "Move to Inactive"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Reaction Users Modal — opens on clicking a reaction badge */}
      {activeReactionModal && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setActiveReactionModal(null)}
        >
          <Card
            className="w-full max-w-xs p-4 space-y-4 shadow-2xl border-border animate-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <i className={cn("fa-solid text-base", activeReactionModal.emoji, REACTION_COLOR_MAP[activeReactionModal.emoji] || "text-primary")} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Reactions ({activeReactionModal.users.length})
                  </h3>
                  <p className="text-[10px] text-muted-foreground">People who reacted with this icon</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReactionModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Users List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 py-1 pr-1">
              {activeReactionModal.users.map((userName, uIdx) => (
                <div key={uIdx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase flex-shrink-0">
                      {userName.charAt(0)}
                    </span>
                    <span className="font-bold text-xs text-foreground truncate">{userName}</span>
                  </div>
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    Reacted
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-border/60 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveReactionModal(null)}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Read Info Modal Dialog */}
      {readInfoMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setReadInfoMsg(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-primary" /> Message Info
              </h3>
              <button onClick={() => setReadInfoMsg(null)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">@ {readInfoMsg.senderName}</p>
              <p className="text-muted-foreground">{readInfoMsg.content}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-check-double text-sky-400 font-bold text-sm" /> Read Status
                </span>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  {readInfoMsg.read || (readInfoMsg.readBy && readInfoMsg.readBy.length > 0) ? (
                    <>
                      <i className="fa-solid fa-check-double text-sky-400 text-xs" /> Read
                    </>
                  ) : (
                    "Sent (Unread)"
                  )}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <i className="fa-solid fa-clock text-xs" /> Sent Timestamp
                </label>
                <p className="font-mono text-foreground font-semibold">
                  {new Date(readInfoMsg.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>

              {readInfoMsg.readBy && readInfoMsg.readBy.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <i className="fa-solid fa-users text-xs" /> Read By Teammates
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {readInfoMsg.readBy.map((usr, uIdx) => (
                      <span key={uIdx} className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-md">
                        {usr}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => setReadInfoMsg(null)} className="w-full font-semibold">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Forward Message Modal Dialog */}
      {forwardMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setForwardMsg(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-share text-indigo-500" /> Forward Message
              </h3>
              <button onClick={() => setForwardMsg(null)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-foreground">@ {forwardMsg.senderName}</p>
              <p className="text-muted-foreground line-clamp-3">{forwardMsg.content}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-foreground">Select Destination Channel / DM</label>
              <select
                value={forwardTargetChannel}
                onChange={(e) => setForwardTargetChannel(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none"
              >
                <option value="general"># general</option>
                <option value="projects"># projects</option>
                <option value="engineering"># engineering</option>
                <option value="random"># random</option>
                {teamMembers.map((m: any) => {
                  const dmChan = `dm_${m.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
                  return (
                    <option key={m._id || m.email} value={dmChan}>
                      DM: {m.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setForwardMsg(null)}>
                Cancel
              </Button>
              <Button color="primary" size="sm" onClick={() => handleForwardMessage(forwardTargetChannel)} className="font-semibold gap-1.5">
                <i className="fa-solid fa-share text-xs" /> Forward Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <i className="fa-solid fa-trash-can text-xl" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                {deleteConfirm.deleteMode === "everyone" ? "Delete for Everyone?" : "Delete for You?"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {deleteConfirm.deleteMode === "everyone"
                  ? "This message will be deleted for all members in this channel. This action cannot be undone."
                  : "This message will be removed from your chat view."}
              </p>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-lg text-xs italic text-muted-foreground truncate">
              "{deleteConfirm.content}"
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                className="w-full font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmExecuteMessageDelete}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
              >
                <i className="fa-solid fa-trash-can text-xs" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image / Attachment Lightbox Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-3 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                  <i className="fa-solid fa-image text-primary" /> {previewImageModal.name}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Size: {Math.round(previewImageModal.size / 1024)} KB
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  asChild
                  size="sm"
                  color="primary"
                  className="font-semibold text-xs gap-1.5"
                >
                  <a href={previewImageModal.url} download={previewImageModal.name} target="_blank" rel="noopener noreferrer">
                    <i className="fa-solid fa-download text-xs" /> Download
                  </a>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </div>
            </div>

            {/* Main Preview Image Container */}
            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden rounded-xl bg-black/40 border border-border/40 p-2">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
