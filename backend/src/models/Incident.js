const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  incidentType: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  camera: { type: mongoose.Schema.Types.ObjectId, ref: "Camera", default: null },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", required: true },
  status: { type: String, enum: ["Open", "In Progress", "Resolved"], default: "Open", required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

incidentSchema.index({ status: 1 });
incidentSchema.index({ priority: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ title: "text", incidentType: "text", description: "text", location: "text" });

module.exports = mongoose.model("Incident", incidentSchema);
