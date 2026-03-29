import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  audienceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Audience",
    required: false,
  },
  template: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "scheduled", "sending", "sent", "failed"],
    default: "draft",
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  stats: {
    sent: { type: Number, default: 0 },
    uniqueOpens: { type: Number, default: 0 },
    totalOpens: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    bounces: { type: Number, default: 0 },
    hardBounces: { type: Number, default: 0 },
    softBounces: { type: Number, default: 0 },
    unsubscribes: { type: Number, default: 0 },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true,
});

export default mongoose.model("Campaign", campaignSchema);
