import express from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";
import Promo from "../models/Promo.js";

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing in env");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// middleware to get user from token (optional — used when a logged-in user is buying)
async function getUserFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("No token");
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new Error("User not found");
  return user;
}

const titleCase = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/** "booth-single" → "TTFC 2026 Exhibition Booth — Single"
 *  "apex"         → "TTFC Apex Pass"                        */
function productNameFor(tier) {
  const t = String(tier);
  if (t.startsWith("booth-")) {
    return `TTFC 2026 Exhibition Booth — ${titleCase(t.replace("booth-", ""))}`;
  }
  return `TTFC ${titleCase(t)} Pass`;
}

// ================= CREATE CHECKOUT =================
// NOTE: server.js mounts this at /api/payments, so the path here is just /create-checkout
// Frontend calls: POST /api/payments/create-checkout
router.post("/create-checkout", async (req, res) => {
  try {
    const { type, tier, promoCode, metadata } = req.body;

    // ═══════════════════════════════════════════════════════
    // BRANCH 1: INDIA PAVILION DEPOSIT ($500 CAD + 13% HST via Stripe Tax)
    // ═══════════════════════════════════════════════════════
    if (type === "pavilion-deposit") {
      const stripe = getStripe();

      const companyName = metadata?.companyName || "Pavilion Applicant";
      const contactEmail = metadata?.contactEmail;
      const applicationRef = metadata?.applicationRef || "N/A";

      if (!contactEmail) {
        return res.status(400).json({ error: "Contact email is required" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: contactEmail,
        line_items: [{
          price_data: {
            currency: "cad",
            product_data: {
              name: "India Startup Pavilion — Application Deposit",
              description: `TTFC 2026 · ${companyName} · Ref: ${applicationRef}`,
              // General tax code; Stripe Tax will apply HST for Canadian customers.
              tax_code: "txcd_10000000",
            },
            unit_amount: 50000, // $500.00 CAD base amount (HST added on top)
            tax_behavior: "exclusive", // HST added on top, not included
          },
          quantity: 1,
        }],
        automatic_tax: {
          enabled: true, // Stripe Tax calculates HST based on customer location
        },
        // Collect billing address so Stripe can determine the correct tax rate
        billing_address_collection: "required",
        // Optional: collect tax IDs (for business customers who want to input their GST/HST)
        tax_id_collection: {
          enabled: true,
        },
        success_url: `${process.env.FRONTEND_URL}/exhibit/india-pavilion/pay?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/exhibit/india-pavilion/pay?canceled=true`,
        metadata: {
          type: "pavilion-deposit",
          companyName,
          contactEmail,
          applicationRef,
        },
      });

      return res.json({ url: session.url });
    }

    // ═══════════════════════════════════════════════════════
    // BRANCH 2: TIER PURCHASE — delegate passes AND exhibition booths
    // Booths arrive as tier "booth-single", "booth-double", etc.
    // ═══════════════════════════════════════════════════════
    if (!tier) return res.status(400).json({ error: "Tier required" });

    const inventoryItem = await TicketInventory.findOne({ tier });
    if (!inventoryItem) return res.status(404).json({ error: "Tier not found" });

    const basePriceCAD = inventoryItem.price;
    const isBooth = String(tier).startsWith("booth-");

    // A tier seeded without a price would otherwise create a $0 Stripe session
    if (!basePriceCAD || basePriceCAD <= 0) {
      return res.status(409).json({ error: "This tier is not available for purchase yet." });
    }

    // Don't sell past the allocation (total 0 = unlimited / not yet capped)
    if (inventoryItem.total > 0 && inventoryItem.sold >= inventoryItem.total) {
      return res.status(409).json({ error: "This tier is sold out." });
    }

    const stripe = getStripe();

    // ===== PROMO CODE HANDLING (with tier check) =====
    let appliedDiscount = 0;
    let appliedPromo = null;

    if (promoCode) {
      const code = String(promoCode).trim().toUpperCase();
      const promo = await Promo.findOne({ code, active: true });

      if (promo) {
        // Per-tier scoping: empty tiers array = valid for all passes AND booths
        const tiersOk = !Array.isArray(promo.tiers) || promo.tiers.length === 0
          || promo.tiers.includes(String(tier).toLowerCase());

        if (tiersOk) {
          appliedDiscount = promo.discount;
          appliedPromo = promo;
        }
      }
      // If invalid/wrong-tier, silently ignore — frontend already showed an error to user.
    }

    // ===== STRIPE: use a coupon for percent-off =====
    let discountsArg = undefined;
    if (appliedDiscount > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: appliedDiscount,
        duration: "once",
        name: appliedPromo ? `${appliedPromo.code} (${appliedDiscount}% off)` : `${appliedDiscount}% off`,
      });
      discountsArg = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "cad",
          product_data: { name: productNameFor(tier) },
          unit_amount: Math.round(basePriceCAD * 100),
        },
        quantity: 1,
      }],
      discounts: discountsArg,
      success_url: isBooth
        ? `${process.env.FRONTEND_URL}/exhibit?success=true`
        : `${process.env.FRONTEND_URL}/tickets?success=true`,
      cancel_url: isBooth
        ? `${process.env.FRONTEND_URL}/exhibit`
        : `${process.env.FRONTEND_URL}/tickets`,
      metadata: {
        type: isBooth ? "booth" : "ticket",
        tier,
        promoCode: appliedPromo ? appliedPromo.code : "",
        discount: String(appliedDiscount),
      },
    });

    if (appliedPromo) {
      await Promo.updateOne({ _id: appliedPromo._id }, { $inc: { timesUsed: 1 } });
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message || "Checkout failed" });
  }
});

export default router;
