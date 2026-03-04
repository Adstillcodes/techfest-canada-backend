import mongoose from "mongoose";

const ticketInventorySchema = new mongoose.Schema(
  {
    // tier name (standard, pro, vip)
    tier: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // total tickets available for this tier
    total: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },

    // how many sold so far
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= VIRTUALS ================= */

// remaining tickets (computed)
ticketInventorySchema.virtual("remaining").get(function () {
  return Math.max(this.total - this.sold, 0);
});

// prevent negative oversell at DB level
ticketInventorySchema.pre("save", async function () {
  if (this.sold > this.total) {
    throw new Error("Sold cannot exceed total tickets");
  }
});

const TicketInventory = mongoose.model(
  "TicketInventory",
  ticketInventorySchema
);

export default TicketInventory;