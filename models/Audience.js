import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    default: "",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const audienceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  contacts: [contactSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true,
});

audienceSchema.virtual("contactCount").get(function() {
  return this.contacts.length;
});

audienceSchema.set("toJSON", { virtuals: true });
audienceSchema.set("toObject", { virtuals: true });

export default mongoose.model("Audience", audienceSchema);
