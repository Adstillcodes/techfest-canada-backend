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

app.use(cors());
app.use("/api/webhook", webhookRoutes);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
// 🔥 MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running");
});