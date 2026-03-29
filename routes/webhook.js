import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";
import crypto from "crypto";

import { generateTicketPDF } from "../services/pdfTicket.js";
import { sendTicketEmail } from "../services/emailService.js";
import { sendResetPasswordEmail } from "../services/emailService.js";

const router = express.Router();

// ⚠️ raw body required for Stripe
router.post("/stripe", async (req, res) => {

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ====================================================
  // PAYMENT SUCCESS
  // ====================================================
  if (event.type === "checkout.session.completed") {

    try {

      const session = event.data.object;

      const tier = session.metadata.tier;
      const userId = session.metadata.userId;

      const email = session.customer_details?.email;
      const name = session.customer_details?.name || "Guest";

      if (!tier) {
        console.error("❌ Missing tier metadata");
        return res.json({ received: true });
      }

      // ================= INVENTORY UPDATE =================

      const inventory = await TicketInventory.findOne({ tier });

      if (!inventory) {

        console.error("❌ Inventory not found for tier:", tier);

      } else {

        if (inventory.sold >= inventory.total) {

          console.error("❌ Attempted oversell for tier:", tier);

        } else {

          inventory.sold += 1;
          await inventory.save();

          console.log("📦 Inventory updated:", tier);

        }

      }

      // ================= CREATE TICKET =================

      const ticketId = crypto.randomBytes(6).toString("hex");

      // If user purchased while logged in → attach ticket to account
      if (userId && userId !== "guest") {

        const user = await User.findById(userId);

        if (user) {

          user.tickets.push({
            ticketId,
            type: tier,
            purchaseDate: new Date()
          });

          await user.save();

          console.log("🎟 Ticket attached to user:", userId);

        }

      }

      // ================= SEND TICKET EMAIL =================

      if (email) {

        await sendTicketEmail({
          email,
          name,
          ticketId,
          tier
        });

        console.log("📧 Ticket email sent to:", email);

      } else {

        console.error("❌ Email missing from Stripe session");

      }

      console.log("✅ Ticket created:", ticketId);

    } catch (err) {

      console.error("❌ Webhook processing failed:", err);

    }

  }

  res.json({ received: true });

});

export default router;
