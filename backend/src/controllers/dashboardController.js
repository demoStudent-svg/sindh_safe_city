const { dashboardAnalytics } = require("../services/analyticsService");

async function stats(req, res) {
  const data = await dashboardAnalytics();
  res.json({ success: true, data });
}

module.exports = { stats };
