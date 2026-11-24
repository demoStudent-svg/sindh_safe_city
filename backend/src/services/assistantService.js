const Camera = require("../models/Camera");
const Incident = require("../models/Incident");
const { dashboardAnalytics } = require("./analyticsService");

async function answerQuestion(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes("recent") && normalized.includes("incident")) {
    const incidents = await Incident.find().select("incidentId title incidentType location status priority createdAt").sort({ createdAt: -1 }).limit(5);
    if (!incidents.length) return { answer: "There are no incidents in the database yet.", data: { incidents: [] } };
    const summary = incidents.map(item => `${item.incidentId} ${item.title} (${item.status})`).join("; ");
    return { answer: `Here are the five most recent incidents: ${summary}.`, data: { incidents } };
  }
  if (normalized.includes("camera") && normalized.includes("active")) {
    const count = await Camera.countDocuments({ status: "Active" });
    return { answer: `${count} cameras are active.`, data: { count } };
  }
  if (normalized.includes("camera") && normalized.includes("offline")) {
    const count = await Camera.countDocuments({ status: "Offline" });
    return { answer: `${count} cameras are offline.`, data: { count } };
  }
  if (normalized.includes("incident") && (normalized.includes("open") || normalized.includes("unresolved"))) {
    const count = await Incident.countDocuments({ status: "Open" });
    return { answer: `${count} incidents are open.`, data: { count } };
  }
  if (normalized.includes("incident") && normalized.includes("resolved")) {
    const count = await Incident.countDocuments({ status: "Resolved" });
    return { answer: `${count} incidents are resolved.`, data: { count } };
  }
  if (normalized.includes("summary") || normalized.includes("overview") || normalized.includes("how many")) {
    const stats = await dashboardAnalytics();
    return { answer: `There are ${stats.totalCameras} cameras (${stats.activeCameras} active, ${stats.offlineCameras} offline) and ${stats.totalIncidents} incidents (${stats.openIncidents} open, ${stats.resolvedIncidents} resolved).`, data: stats };
  }
  return { answer: "Try asking: “How many cameras are active?”, “How many incidents are open?”, “How many incidents are resolved?”, “Show me recent incidents”, or “How many cameras are offline?”", data: null };
}

module.exports = { answerQuestion };
