import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      required: true,
      unique: true,
    },

    // 🔐 for email/password users
    password: {
      type: String,
      default: null,
    },

    provider: {
      type: String, // "email" | "google" | "linkedin"
      default: "email",
    },
    role: { type: String, default: "user" },
tickets: [
  {
    ticketId: { type: String, required: true },
    type: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    
  },
],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);