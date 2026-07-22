import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubtask {
  title: string;
  completed: boolean;
}

export interface IComment {
  userId: mongoose.Types.ObjectId;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  projectId: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId;
  dueDate?: Date;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Review" | "Done";
  subtasks: ISubtask[];
  comments: IComment[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema<ISubtask>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint" },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Review", "Done"],
      default: "To Do",
    },
    subtasks: [SubtaskSchema],
    comments: [CommentSchema],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
