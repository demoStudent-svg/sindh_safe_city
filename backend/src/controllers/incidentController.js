const mongoose = require("mongoose");
const Camera = require("../models/Camera");
const Incident = require("../models/Incident");
const Notification = require("../models/Notification");
const generateId = require("../utils/generateId");
const recordActivity = require("../utils/recordActivity");

function getPagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function getFilters(query) {
  const filter = {};
  for (const key of ["status", "priority", "incidentType"]) {
    if (query[key]) filter[key] = query[key];
  }
  if (query.q) filter.$text = { $search: query.q };
  return filter;
}

async function checkCamera(cameraId) {
  if (!cameraId) return null;
  if (!mongoose.isValidObjectId(cameraId) || !(await Camera.exists({ _id: cameraId }))) {
    const error = new Error("The selected camera does not exist.");
    error.status = 400;
    throw error;
  }
  return cameraId;
}

async function create(req, res) {
  const camera = await checkCamera(req.body.camera);
  const incident = await Incident.create({
    title: req.body.title,
    incidentType: req.body.incidentType,
    description: req.body.description,
    location: req.body.location,
    priority: req.body.priority,
    status: req.body.status,
    camera,
    incidentId: generateId("INC"),
    reportedBy: req.user._id
  });
  await Promise.all([
    recordActivity({ user: req.user._id, action: "Incident created", description: `Created incident ${incident.incidentId}.`, entityType: "Incident", entityId: incident._id.toString() }),
    Notification.create({ title: "New incident", message: `${incident.incidentId}: ${incident.title}`, type: incident.priority === "Critical" ? "Alert" : "Info" })
  ]);
  res.status(201).json({ success: true, message: "Incident created successfully.", data: { incident } });
}

async function list(req, res) {
  const { page, limit, skip } = getPagination(req.query);
  const filter = getFilters(req.query);
  const [incidents, total] = await Promise.all([
    Incident.find(filter).populate("camera", "cameraId cameraName location").populate("reportedBy", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Incident.countDocuments(filter)
  ]);
  res.json({ success: true, data: { incidents, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}

async function getById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid incident identifier." });
  const incident = await Incident.findById(req.params.id).populate("camera", "cameraId cameraName location").populate("reportedBy", "name email");
  if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
  res.json({ success: true, data: { incident } });
}

async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid incident identifier." });
  const existing = await Incident.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: "Incident not found." });
  const allowedFields = ["title", "incidentType", "description", "location", "camera", "priority", "status"];
  const updates = Object.fromEntries(allowedFields.filter(field => Object.hasOwn(req.body, field)).map(field => [field, req.body[field]]));
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "Provide at least one incident field to update." });
  if (Object.hasOwn(updates, "camera")) updates.camera = await checkCamera(updates.camera);
  const incident = await Incident.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  const changedStatus = req.body.status && existing.status !== incident.status;
  await recordActivity({
    user: req.user._id,
    action: changedStatus ? "Incident status changed" : "Incident updated",
    description: changedStatus ? `Incident ${incident.incidentId} status changed to ${incident.status}.` : `Updated incident ${incident.incidentId}.`,
    entityType: "Incident",
    entityId: incident._id.toString()
  });
  res.json({ success: true, message: "Incident updated successfully.", data: { incident } });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid incident identifier." });
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: "Incident not found." });
  await incident.deleteOne();
  await recordActivity({ user: req.user._id, action: "Incident deleted", description: `Deleted incident ${incident.incidentId}.`, entityType: "Incident", entityId: incident._id.toString() });
  res.json({ success: true, message: "Incident deleted successfully.", data: { id: incident._id } });
}

module.exports = { create, list, getById, update, remove };
