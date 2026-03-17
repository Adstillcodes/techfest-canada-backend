import mongoose from "mongoose";

const kycSchema = new mongoose.Schema(
  {
    company_name: String,
    brand_name: String,
    website: String,
    country_hq: String,
    canada_ops: String,

    primary_email: String,
    primary_phone: String,

    company_type: [String],
    primary_industry: String,
    product_description: String,

    // dynamic sections
    section_2_notes: String,
    section_3_notes: String,
    section_4_notes: String,
    section_5_notes: String,
    section_6_notes: String,
    section_7_notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Kyc", kycSchema);