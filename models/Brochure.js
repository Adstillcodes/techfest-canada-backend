import mongoose from "mongoose";

const brochureSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  company:   { type: String },
  jobTitle:  { type: String },
  industry:  { type: String },
  email:     { type: String, required: true },
  phone:     { type: String },
}, { timestamps: true });

export default mongoose.model("Brochure", brochureSchema);