"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Megaphone, 
  Hash, 
  Circle, 
  User, 
  Plus, 
  Pin, 
  X,
  PhoneCall
} from "lucide-react";
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

export default function CommunicationHub() {
  const [activeTab, setActiveTab] = useState<"chat" | "mail" | "whatsapp" | "announcements">("chat");

  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [mails, setMails] = useState<MailItem[]>(INITIAL_MAILS);
  const [selectedMailId, setSelectedMailId] = useState<string>("m1");

  const [waThreads, setWaThreads] = useState<WAThread[]>(INITIAL_WA_THREADS);
  const [selectedWaId, setSelectedWaId] = useState<string>("wa1");
  const [waReplyText, setWaReplyText] = useState("");

  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: "",
    content: "",
    category: "Company News" as AnnouncementData["category"],
    pinned: false,
  });

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

  const selectedMail = mails.find((m) => m.id === selectedMailId);
  const selectedWaThread = waThreads.find((w) => w.id === selectedWaId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Communication Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time team chat, Mail Center, WhatsApp Business threads, and company announcements.
        </p>
      </div>

      {/* Tabs */}
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
          <MessageSquare className="w-4 h-4" /> Workspace Chat
        </button>

        <button
          onClick={() => setActiveTab("mail")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "mail"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Mail className="w-4 h-4" /> Mail Center
        </button>

        <button
          onClick={() => setActiveTab("whatsapp")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "whatsapp"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <PhoneCall className="w-4 h-4 text-emerald-500" /> WhatsApp Panel
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "announcements"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Megaphone className="w-4 h-4" /> Announcements
        </button>
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
          <Card className="p-4 space-y-4 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Channels</h3>
            <div className="space-y-1">
              {["general", "projects", "engineering", "random"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left",
                    selectedChannel === ch ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Hash className="w-4 h-4" /> {ch}
                </button>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-3 p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3 border-b border-border font-semibold text-foreground">
              <Hash className="w-4 h-4 text-primary" /> {selectedChannel}
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
              {loadingChat ? (
                <div className="text-center text-xs text-muted-foreground py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No messages in #{selectedChannel} yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m._id} className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">{m.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{m.content}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-border">
              <Input
                type="text"
                placeholder={`Message #${selectedChannel}...`}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
              />
              <Button color="primary" type="submit">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
