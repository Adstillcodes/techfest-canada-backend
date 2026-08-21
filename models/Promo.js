import mongoose from "mongoose";

/* Tiers a promo code can be scoped to.
   Empty `tiers` array still means "everything" — passes and booths alike.
   Keep this list in sync with ALLOWED_TIERS in routes/promos.js. */
export const PROMO_TIERS = [
  "connect",
  "influence",
  "power",
  "apex",
  "booth-single",
  "booth-double",
  "booth-triple",
  "booth-quadruple",
];

const promoSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  discount: { type: Number, required: true, min: 1, max: 100 }, // percent

  // Empty array = applies to ALL passes AND booths.
  // Otherwise only the listed tiers can use it.
  tiers: { type: [String], default: [], enum: PROMO_TIERS },

  active: { type: Boolean, default: true },
  timesUsed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Promo", promoSchema);
