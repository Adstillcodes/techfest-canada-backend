import mongoose from "mongoose";

const emailTrackingSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "delivered", "opened", "clicked", "bounced", "failed"],
    default: "pending",
  },
  opens: [{
    timestamp: { type: Date, default: Date.now },
    userAgent: String,
    ip: String,
  }],
  clicks: [{
    timestamp: { type: Date, default: Date.now },
    url: String,
    userAgent: String,
    ip: String,
  }],
  bounceInfo: {
    type: { type: String, enum: ["hard", "soft", null], default: null },
    reason: String,
    timestamp: Date,
  },
  firstOpenAt: Date,
  lastOpenAt: Date,
  firstClickAt: Date,
  lastClickAt: Date,
}, {
  timestamps: true,
});

emailTrackingSchema.index({ campaignId: 1, email: 1 }, { unique: true });

emailTrackingSchema.virtual("uniqueOpens").get(function() {
  return this.opens.length > 0;
});

emailTrackingSchema.virtual("uniqueClicks").get(function() {
  return this.clicks.length > 0;
});

emailTrackingSchema.set("toJSON", { virtuals: true });
emailTrackingSchema.set("toObject", { virtuals: true });

export default mongoose.model("EmailTracking", emailTrackingSchema);
