import mongoose from "mongoose";

const agendaSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true },
  industry:  { type: String, required: true },
  jobTitle:  { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Agenda", agendaSchema);