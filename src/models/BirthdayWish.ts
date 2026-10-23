import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWishAttachment {
  url: string;              // Uploaded path (e.g. /uploads/birthdays/uuid.webp)
  name: string;             // Original file name (e.g. team_lunch_photo.jpg)
  type: "image" | "file";   // Classification
  size?: number;            // Size in bytes
}

export interface IWishReaction {
  userId: mongoose.Types.ObjectId;
  userName: string;
  emoji: string;            // E.g. "❤️", "🍰", "🥳", "🙏", "🔥"
  createdAt: Date;
}

export interface IBirthdayWish extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderPhotoUrl?: string;
  senderDepartment?: string;
  message: string;
  sticker: "cake" | "balloons" | "cheers" | "star" | "gift";
  type: "birthday" | "anniversary";
  attachments: IWishAttachment[];
  reactions: IWishReaction[];
  year: number;             // E.g. 2026
  acknowledged: boolean;    // Marked true when celebrant says thanks
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BirthdayWishSchema = new Schema<IBirthdayWish>(
  {
    recipientId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName:       { type: String, required: true, trim: true },
    senderPhotoUrl:   { type: String, default: "" },
    senderDepartment: { type: String, default: "" },
    message:          { type: String, required: true, trim: true, maxlength: 600 },
    sticker:          { type: String, enum: ["cake", "balloons", "cheers", "star", "gift"], default: "cake" },
    type:             { type: String, enum: ["birthday", "anniversary"], default: "birthday" },
    attachments: [
      {
        url:  { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["image", "file"], default: "image" },
        size: { type: Number, default: 0 },
      }
    ],
    reactions: [
      {
        userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName:  { type: String, required: true },
        emoji:     { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    year:             { type: Number, required: true },
    acknowledged:     { type: Boolean, default: false },
    tenantId:         { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// One wish per sender per recipient per calendar year per event type
BirthdayWishSchema.index(
  { tenantId: 1, recipientId: 1, senderId: 1, year: 1, type: 1 },
  { unique: true }
);

if (mongoose.models.BirthdayWish) {
  delete mongoose.models.BirthdayWish;
}

export const BirthdayWish: Model<IBirthdayWish> =
  mongoose.models.BirthdayWish ||
  mongoose.model<IBirthdayWish>("BirthdayWish", BirthdayWishSchema);
