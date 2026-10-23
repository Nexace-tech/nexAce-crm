"use client";

import React, { useState, useRef } from "react";

export interface SendWishCelebrant {
  userId: string;
  name: string;
  photoUrl?: string;
  department?: string;
  phone?: string;
  type: "birthday" | "anniversary";
  milestoneText?: string;
}

interface AttachmentItem {
  url: string;
  name: string;
  type: "image" | "file";
  size?: number;
}

interface PresetTemplate {
  id: number;
  category: "Warm" | "Leadership" | "Fun" | "Mentorship" | "Short" | "Milestone";
  label: string;
  text: string;
  sticker: "cake" | "balloons" | "cheers" | "star" | "gift";
}

const BIRTHDAY_TEMPLATES: PresetTemplate[] = [
  {
    id: 1,
    category: "Warm",
    label: "Joy & Health",
    text: "Wishing you a wonderful birthday filled with joy, laughter, and great health! May this upcoming year bring you immense happiness and success. 🎂✨",
    sticker: "cake",
  },
  {
    id: 2,
    category: "Warm",
    label: "Bright Chapter",
    text: "May your special day be filled with warm moments, unforgettable memories, and smiles. Wishing you the happiest of celebrations and a fabulous year ahead! 🌸",
    sticker: "balloons",
  },
  {
    id: 3,
    category: "Leadership",
    label: "Team Pillar",
    text: "Happy Birthday! Thank you for your leadership, dedication, and positive energy that elevates our entire team. Wishing you continued milestones and career triumphs! 🌟",
    sticker: "star",
  },
  {
    id: 4,
    category: "Leadership",
    label: "Valued Contributor",
    text: "Wishing you a very Happy Birthday! Your hard work, expertise, and collaborative spirit make a tremendous impact on our projects. Here's to achieving even greater heights this year! 🏆",
    sticker: "star",
  },
  {
    id: 5,
    category: "Fun",
    label: "Extra Cake Slice",
    text: "Happy Birthday! Take a well-deserved break, enjoy an extra slice of cake, and let someone else answer the urgent emails today! You've earned it! 🎁🥳",
    sticker: "gift",
  },
  {
    id: 6,
    category: "Fun",
    label: "Bug-Free Day",
    text: "Happy Birthday to our resident rockstar! May your day be packed with good vibes, lots of treats, zero bugs, and plenty of reasons to smile! 🎈🍕",
    sticker: "cheers",
  },
  {
    id: 7,
    category: "Mentorship",
    label: "Grateful Mentee",
    text: "Happy Birthday! Grateful every day for your constant guidance, wisdom, and patience. Working alongside you makes every challenge so much easier. Have an incredible celebration! 🥂",
    sticker: "cheers",
  },
  {
    id: 8,
    category: "Mentorship",
    label: "Inspiring Force",
    text: "Happy Birthday! Your passion, insights, and mentorship inspire all of us to do our best work. Wishing you a relaxing and joyful celebration with loved ones! ✨",
    sticker: "star",
  },
  {
    id: 9,
    category: "Short",
    label: "Pure Joy",
    text: "Wishing you the happiest of birthdays today! May your year ahead be as bright and inspiring as you are! 🍰💛",
    sticker: "cake",
  },
  {
    id: 10,
    category: "Short",
    label: "Fantastic Day",
    text: "Happy Birthday! Hope you have a fantastic day celebrating and an extraordinary year ahead! 🎉🥂",
    sticker: "cheers",
  },
  {
    id: 11,
    category: "Milestone",
    label: "Sky is Limit",
    text: "Happy Birthday! Here's to celebrating where you are today and all the amazing places your talent and hard work will take you this year. Reach for the stars! 🚀🎈",
    sticker: "balloons",
  },
  {
    id: 12,
    category: "Warm",
    label: "Fortunate Team",
    text: "Happy Birthday from all of us! So fortunate to have you on our team — your positive spirit, humor, and teamwork make all the difference every single day! 🤝🎂",
    sticker: "cake",
  },
];

const ANNIVERSARY_TEMPLATES: PresetTemplate[] = [
  {
    id: 101,
    category: "Milestone",
    label: "Great Milestone",
    text: "🏆 Happy Work Anniversary! Huge congratulations on reaching another fantastic milestone with our team. Thank you for your dedication, innovation, and brilliant work!",
    sticker: "star",
  },
  {
    id: 102,
    category: "Warm",
    label: "Always a Pleasure",
    text: "🌟 Happy Anniversary! Working alongside you is always an absolute pleasure. Here's to many more victories, breakthroughs, and celebrated milestones together!",
    sticker: "cheers",
  },
  {
    id: 103,
    category: "Leadership",
    label: "Tremendous Impact",
    text: "🚀 Happy Work Anniversary! Thank you for the tremendous impact and positive energy you bring to the company every single day. The team is so much stronger with you!",
    sticker: "star",
  },
  {
    id: 104,
    category: "Short",
    label: "Cheers to Growth",
    text: "🏅 Congratulations on your Work Anniversary! Your loyalty, expertise, and commitment inspire everyone around you. Cheers to your continued journey and success!",
    sticker: "cheers",
  },
];

const STICKERS: Array<{ id: "cake" | "balloons" | "cheers" | "star" | "gift"; label: string; icon: string }> = [
  { id: "cake", label: "Cake", icon: "fa-cake-candles" },
  { id: "balloons", label: "Balloons", icon: "fa-heart" },
  { id: "cheers", label: "Cheers", icon: "fa-champagne-glasses" },
  { id: "star", label: "Star", icon: "fa-star" },
  { id: "gift", label: "Gift", icon: "fa-gift" },
];

export function SendBirthdayWishModal({
  isOpen,
  onClose,
  celebrant,
  onWishSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  celebrant: SendWishCelebrant | null;
  onWishSent?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [selectedSticker, setSelectedSticker] = useState<"cake" | "balloons" | "cheers" | "star" | "gift">("cake");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !celebrant) return null;

  const isAnniversary = celebrant.type === "anniversary";
  const templates = isAnniversary ? ANNIVERSARY_TEMPLATES : BIRTHDAY_TEMPLATES;
  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];

  const filteredTemplates = activeCategory === "All"
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  const handleSelectTemplate = (template: PresetTemplate) => {
    setMessage(template.text);
    setSelectedSticker(template.sticker);
    setErrorMsg("");
  };

  /**
   * Compresses image using canvas down to max 1280px WebP before upload
   */
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      // If PDF or SVG, don't use canvas
      if (file.type === "application/pdf" || file.type.includes("svg")) {
        return resolve(file);
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            "image/webp",
            0.85
          );
        } else {
          resolve(file);
        }
      };

      img.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 4) {
      setErrorMsg("You can attach a maximum of 4 photos/documents.");
      return;
    }

    setUploading(true);
    setErrorMsg("");

    try {
      const newAttachments: AttachmentItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i];
        const compressedBlob = await compressImage(rawFile);

        const formData = new FormData();
        const safeName = rawFile.name.replace(/\.[^/.]+$/, "") + ".webp";
        formData.append("file", compressedBlob, safeName);

        const res = await fetch("/api/birthdays/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to upload ${rawFile.name}`);
        }

        const data = await res.json();
        newAttachments.push({
          url: data.url,
          name: rawFile.name,
          type: data.type || "image",
          size: data.size,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err?.message || "File upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitWish = async () => {
    if (!message.trim()) {
      setErrorMsg("Please enter a personal wish or pick a template.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/birthdays/wish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: celebrant.userId,
          message: message.trim(),
          sticker: selectedSticker,
          type: celebrant.type,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send celebration wish");
      }

      setSuccessMsg("Wish sent successfully! 🎉");
      setTimeout(() => {
        if (onWishSent) onWishSent();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Send wish error:", err);
      setErrorMsg(err?.message || "Could not send wish. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppShare = () => {
    let cleanPhone = (celebrant.phone || "").replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.slice(1);
    if (!cleanPhone.startsWith("+") && cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`; // Default Indian country code if 10 digits
    }

    const textToShare = message.trim() || `🎉 Happy Birthday, ${celebrant.name}! Wishing you a wonderful day filled with joy and success! 🎂✨`;
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToShare)}`
      : `https://wa.me/?text=${encodeURIComponent(textToShare)}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Fixed Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              {celebrant.photoUrl ? (
                <img
                  src={celebrant.photoUrl}
                  alt={celebrant.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/40"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm">
                  {celebrant.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-xs">
                {isAnniversary ? "🏆" : "🎂"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                  Wish {celebrant.name}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  {isAnniversary ? "Anniversary" : "Birthday"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAnniversary && celebrant.milestoneText ? celebrant.milestoneText : celebrant.department || "Team Member"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <i className="fa-solid fa-circle-check shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 12 Preset Wish Templates Category Filter Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-wand-magic-sparkles text-indigo-500" />
                <span>Quick Preset Wishes</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Click to fill</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 min-h-[32px] ${
                    activeCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Pills Grid */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-2.5 rounded-xl border border-border/80 hover:border-indigo-500/60 bg-card hover:bg-indigo-500/5 transition-all group flex flex-col justify-between min-h-[58px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {template.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-60">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {template.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-pen-fancy text-indigo-500" />
                <span>Your Message</span>
              </label>
              <span className={`text-[11px] ${message.length > 550 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                {message.length}/600
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder={`Write a thoughtful ${isAnniversary ? "work anniversary" : "birthday"} message for ${celebrant.name}...`}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all placeholder:text-muted-foreground/60 resize-none"
            />
          </div>

          {/* Sticker Selection */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              Choose a Celebration Sticker
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STICKERS.map((stk) => {
                const isSelected = selectedSticker === stk.id;
                return (
                  <button
                    key={stk.id}
                    type="button"
                    onClick={() => setSelectedSticker(stk.id)}
                    className={`flex-1 min-w-[70px] min-h-[44px] py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <i className={`fa-solid ${stk.icon} text-base`} />
                    <span className="text-[10px] font-medium">{stk.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Photo Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-images text-indigo-500" />
                <span>Attach Photos &amp; Memories (Max 4)</span>
              </label>
              <span className="text-[11px] text-muted-foreground">{attachments.length}/4</span>
            </div>

            {/* Thumbnail Previews */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
                    {att.type === "image" ? (
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-card">
                        <i className="fa-solid fa-file-pdf text-red-500 text-lg mb-1" />
                        <span className="text-[9px] text-foreground truncate w-full px-1">{att.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Remove"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Upload Trigger */}
            {attachments.length < 4 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-indigo-500/60 rounded-xl p-3 text-center cursor-pointer bg-muted/10 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  className="hidden"
                />
                <i className={`fa-solid ${uploading ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"} text-indigo-500 text-sm`} />
                <span className="text-xs text-muted-foreground font-medium">
                  {uploading ? "Compressing & Uploading..." : "Click to add photos or documents"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 sm:p-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 bg-muted/20">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            title="Open WhatsApp with pre-filled greeting"
          >
            <i className="fa-brands fa-whatsapp text-sm" />
            <span>Wish on WhatsApp</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmitWish}
              disabled={submitting || uploading}
              className="flex-1 sm:flex-initial min-h-[40px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane text-xs" />
                  <span>Send in CRM</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
