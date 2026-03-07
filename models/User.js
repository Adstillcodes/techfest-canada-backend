import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      default: null,
    },

    provider: {
      type: String,
      default: "email",
    },

    role: {
      type: String,
      default: "user"
    },

    tickets: [
      {
        ticketId: { type: String, required: true },
        type: { type: String, required: true },
        purchaseDate: { type: Date, default: Date.now },
        checkedIn: { type: Boolean, default: false },
        checkedInAt: { type: Date },
      }
    ],

    /* ================= PASSWORD RESET ================= */

    resetPasswordToken: String,

    resetPasswordExpires: Date

  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);