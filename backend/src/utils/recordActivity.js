const ActivityLog = require("../models/ActivityLog");

async function recordActivity({ user, action, description, entityType, entityId }) {
  return ActivityLog.create({ user, action, description, entityType, entityId });
}

module.exports = recordActivity;
