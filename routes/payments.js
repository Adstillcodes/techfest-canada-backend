import express from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import User from "../models/User.js";
import TicketInventory from "../models/TicketInventory.js";

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing in env");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// middleware to get user from token
async function getUserFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("No token");

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) throw new Error("User not found");

  return user;
}

// ================= CREATE CHECKOUT =================
uter.post("/create-checkout", async (req, res) => {
  try {

    const { tier } = req.body;
    const normalizedTier = tier.toLowerCase();

    const ticket = await TicketInventory.findOne({ tier: normalizedTier });

    if (!ticket) {
      return res.status(400).json({ error: "Invalid ticket tier" });
    }

    const stripe = getStripe();

    // check if user is logged in
    let userId = null;

    const authHeader = req.headers.authorization;

    if (authHeader) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      // Stripe collects email for guests
      customer_creation: "always",

      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `TechFest ${tier.toUpperCase()} Pass`,
            },
            unit_amount: ticket.price * 100,
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.FRONTEND_URL}/tickets?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/tickets`,

      metadata: {
        tier: normalizedTier,
        userId: userId || "guest"
      }
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
