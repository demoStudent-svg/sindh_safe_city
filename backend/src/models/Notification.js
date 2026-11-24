const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, enum: ["Info", "Success", "Warning", "Alert"], default: "Info" },
  isRead: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
