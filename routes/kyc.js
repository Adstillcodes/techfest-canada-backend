import express from "express";
import Kyc from "../models/Kyc.js";
import { requireAdmin } from "../middleware/adminAuth.js";
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
// GET /api/kyc (Admin only)

router.get("/", requireAdmin, async (req, res) => {
  try {

    const { search, country, industry } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { company_name: { $regex: search, $options: "i" } },
        { primary_email: { $regex: search, $options: "i" } }
      ];
    }

    if (country) query.country_hq = country;
    if (industry) query.primary_industry = industry;

    const data = await Kyc.find(query).sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;