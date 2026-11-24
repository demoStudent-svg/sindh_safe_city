const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

async function listActivity(req, res) {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const [activities, total] = await Promise.all([
    ActivityLog.find().populate("user", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ActivityLog.countDocuments()
  ]);
  res.json({ success: true, data: { activities, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}

async function listNotifications(req, res) {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = { $or: [{ user: req.user._id }, { user: null }] };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter)
  ]);
  res.json({ success: true, data: { notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}

async function markRead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid notification identifier." });
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ user: req.user._id }, { user: null }] },
    { $set: { isRead: true } },
    { new: true, runValidators: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: "Notification not found." });
  res.json({ success: true, message: "Notification marked as read.", data: { notification } });
}

module.exports = { listActivity, listNotifications, markRead };
