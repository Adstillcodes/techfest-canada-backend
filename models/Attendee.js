import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    ticketId: {
      type: String,
      required: true,
      unique: true
    },
    ticketType: {
      type: String,
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkedInAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Attendee = mongoose.model("Attendee", attendeeSchema);

export default Attendee;