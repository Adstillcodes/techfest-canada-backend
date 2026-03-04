// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payments.js";
import webhookRoutes from "./routes/webhook.js";
import checkinRoutes from "./routes/checkin.js";
import adminRoutes from "./routes/admin.js";

const app = express();

/* ==========================================
   CORS CONFIG (DEV + PROD)
========================================== */

const allowedOrigins = [
  "http://localhost:5173",
  "https://techfest-canada-frontend.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"), false);
      }
    },
    credentials: true,
  })
);

/* ==========================================
   STRIPE WEBHOOK (RAW BODY REQUIRED)
========================================== */

app.use("/api/webhook", webhookRoutes);

/* ==========================================
   JSON PARSER
========================================== */

app.use(express.json());

/* ==========================================
   ROUTES
========================================== */

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/admin", adminRoutes);

/* ==========================================
   HEALTH CHECK
========================================== */

app.get("/", (req, res) => {
  res.send("🚀 TechFest API running");
});

/* ==========================================
   DATABASE
========================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ==========================================
   SERVER START
========================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
