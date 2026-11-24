const Incident = require("../models/Incident");
const Camera = require("../models/Camera");

const incidentStatusPipeline = [
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
];
const incidentTypePipeline = [
  { $group: { _id: "$incidentType", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
];
const cameraStatusPipeline = [
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
];
const recentIncidentPipeline = [
  { $sort: { createdAt: -1 } },
  { $limit: 5 },
  { $lookup: { from: "cameras", localField: "camera", foreignField: "_id", as: "cameraInfo" } },
  { $unwind: { path: "$cameraInfo", preserveNullAndEmptyArrays: true } },
  { $project: { incidentId: 1, title: 1, incidentType: 1, location: 1, status: 1, priority: 1, createdAt: 1, camera: "$cameraInfo.cameraName" } }
];
const incidentsByDatePipeline = [
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
];

async function dashboardAnalytics() {
  const [cameraCounts, incidentCounts, recentIncidents] = await Promise.all([
    Camera.aggregate(cameraStatusPipeline),
    Incident.aggregate(incidentStatusPipeline),
    Incident.aggregate(recentIncidentPipeline)
  ]);
  const cameras = Object.fromEntries(cameraCounts.map(row => [row._id, row.count]));
  const incidents = Object.fromEntries(incidentCounts.map(row => [row._id, row.count]));
  return {
    totalCameras: Object.values(cameras).reduce((sum, count) => sum + count, 0),
    activeCameras: cameras.Active || 0,
    offlineCameras: cameras.Offline || 0,
    totalIncidents: Object.values(incidents).reduce((sum, count) => sum + count, 0),
    openIncidents: incidents.Open || 0,
    resolvedIncidents: incidents.Resolved || 0,
    recentIncidents
  };
}

module.exports = {
  dashboardAnalytics,
  incidentStatusPipeline,
  incidentTypePipeline,
  cameraStatusPipeline,
  recentIncidentPipeline,
  incidentsByDatePipeline
};
