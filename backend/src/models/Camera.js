const mongoose = require("mongoose");

const cameraSchema = new mongoose.Schema({
  cameraId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  cameraName: { type: String, required: true, trim: true, maxlength: 120 },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  cameraType: { type: String, trim: true, maxlength: 80, default: "CCTV" },
  status: { type: String, enum: ["Active", "Offline", "Maintenance"], default: "Active", required: true },
  description: { type: String, trim: true, maxlength: 1000, default: "" }
}, { timestamps: true });

cameraSchema.index({ status: 1 });
cameraSchema.index({ cameraName: "text", location: "text", description: "text" });

module.exports = mongoose.model("Camera", cameraSchema);
