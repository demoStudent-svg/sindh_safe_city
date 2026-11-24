const mongoose = require("mongoose");
const Camera = require("../models/Camera");
const Incident = require("../models/Incident");
const generateId = require("../utils/generateId");
const recordActivity = require("../utils/recordActivity");

function pagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function filters(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.$text = { $search: query.q };
  return filter;
}

async function create(req, res) {
  const camera = await Camera.create({
    cameraId: req.body.cameraId || generateId("CAM"),
    cameraName: req.body.cameraName,
    location: req.body.location,
    cameraType: req.body.cameraType,
    status: req.body.status,
    description: req.body.description
  });
  await recordActivity({ user: req.user._id, action: "Camera added", description: `Added camera ${camera.cameraId}.`, entityType: "Camera", entityId: camera._id.toString() });
  res.status(201).json({ success: true, message: "Camera created successfully.", data: { camera } });
}

async function list(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = filters(req.query);
  const [cameras, total] = await Promise.all([
    Camera.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Camera.countDocuments(filter)
  ]);
  res.json({ success: true, data: { cameras, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}

async function getById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid camera identifier." });
  const camera = await Camera.findById(req.params.id);
  if (!camera) return res.status(404).json({ success: false, message: "Camera not found." });
  res.json({ success: true, data: { camera } });
}

async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid camera identifier." });
  const allowedFields = ["cameraId", "cameraName", "location", "cameraType", "status", "description"];
  const updates = Object.fromEntries(allowedFields.filter(field => Object.hasOwn(req.body, field)).map(field => [field, req.body[field]]));
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "Provide at least one camera field to update." });
  const camera = await Camera.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  if (!camera) return res.status(404).json({ success: false, message: "Camera not found." });
  await recordActivity({ user: req.user._id, action: "Camera updated", description: `Updated camera ${camera.cameraId}.`, entityType: "Camera", entityId: camera._id.toString() });
  res.json({ success: true, message: "Camera updated successfully.", data: { camera } });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid camera identifier." });
  const camera = await Camera.findById(req.params.id);
  if (!camera) return res.status(404).json({ success: false, message: "Camera not found." });
  if (await Incident.exists({ camera: camera._id })) {
    return res.status(409).json({ success: false, message: "Camera is referenced by incident records and cannot be deleted." });
  }
  await camera.deleteOne();
  await recordActivity({ user: req.user._id, action: "Camera deleted", description: `Deleted camera ${camera.cameraId}.`, entityType: "Camera", entityId: camera._id.toString() });
  res.json({ success: true, message: "Camera deleted successfully.", data: { id: camera._id } });
}

module.exports = { create, list, getById, update, remove };
