import express from "express";
import Kyc from "../models/Kyc.js";

const router = express.Router();

// POST /api/kyc
router.post("/", async (req, res) => {
  try {
    const newKyc = new Kyc(req.body);
    await newKyc.save();

    res.status(201).json({
      message: "KYC submitted successfully",
      data: newKyc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;