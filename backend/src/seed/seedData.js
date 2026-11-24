require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDatabase = require("../config/db");
const User = require("../models/User");
const Camera = require("../models/Camera");
const Incident = require("../models/Incident");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");

const cameraLocations = [
  "Shahrah-e-Faisal", "Clifton Block 2", "Gulshan Chowrangi", "Saddar Town",
  "Karachi Metropole", "University Road", "North Nazimabad", "Korangi Road",
  "Town Hall Road", "Airport Road", "Defence Phase 5", "Lyari Expressway"
];
const incidentTypes = ["Traffic Violation", "Unauthorized Entry", "Vehicle Alert", "Road Obstruction", "Public Safety"];
const priorities = ["Low", "Medium", "High", "Critical"];
const statuses = ["Open", "In Progress", "Resolved"];

async function seedData() {
  await connectDatabase();
  await Promise.all([User.init(), Camera.init(), Incident.init(), ActivityLog.init(), Notification.init()]);

  const email = "operator@safecity.example";
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "Sample Operator",
      email,
      password: await bcrypt.hash("safecity-demo-2026", 12),
      role: "Operator"
    });
  }

  const cameraOps = Array.from({ length: 60 }, (_, index) => {
    const number = index + 1;
    return {
      updateOne: {
        filter: { cameraId: `CAM-${String(number).padStart(3, "0")}` },
        update: { $setOnInsert: {
          cameraId: `CAM-${String(number).padStart(3, "0")}`,
          cameraName: `Safe City Camera ${number}`,
          location: cameraLocations[index % cameraLocations.length],
          cameraType: index % 3 === 0 ? "ANPR" : "CCTV",
          status: index % 10 === 0 ? "Offline" : index % 13 === 0 ? "Maintenance" : "Active",
          description: `Fictional demonstration camera ${number}.`
        } },
        upsert: true
      }
    };
  });
  await Camera.bulkWrite(cameraOps, { ordered: false });
  const cameras = await Camera.find({ cameraId: /^CAM-/ }).sort({ cameraId: 1 }).limit(60).select("_id cameraId");

  const incidentOps = Array.from({ length: 900 }, (_, index) => {
    const number = index + 1;
    const status = statuses[number % statuses.length];
    return {
      updateOne: {
        filter: { incidentId: `INC-SEED-${String(number).padStart(4, "0")}` },
        update: { $setOnInsert: {
          incidentId: `INC-SEED-${String(number).padStart(4, "0")}`,
          title: `${incidentTypes[number % incidentTypes.length]} report ${number}`,
          incidentType: incidentTypes[number % incidentTypes.length],
          description: `Fictional university project sample incident ${number}.`,
          location: cameraLocations[number % cameraLocations.length],
          camera: cameras[number % cameras.length]._id,
          priority: priorities[number % priorities.length],
          status,
          reportedBy: user._id,
          createdAt: new Date(Date.now() - number * 3600000)
        } },
        upsert: true
      }
    };
  });
  await Incident.bulkWrite(incidentOps, { ordered: false });

  await ActivityLog.bulkWrite(Array.from({ length: 20 }, (_, index) => ({
    updateOne: {
      filter: { entityId: `SEED-ACTIVITY-${index + 1}` },
      update: { $setOnInsert: {
        user: user._id,
        action: index % 2 ? "Incident created" : "Camera status checked",
        description: `Sample activity event ${index + 1}.`,
        entityType: index % 2 ? "Incident" : "Camera",
        entityId: `SEED-ACTIVITY-${index + 1}`,
        createdAt: new Date(Date.now() - index * 60000)
      } },
      upsert: true
    }
  })), { ordered: false });

  await Notification.bulkWrite(Array.from({ length: 20 }, (_, index) => ({
    updateOne: {
      filter: { title: `Sample notification ${index + 1}`, user: user._id },
      update: { $setOnInsert: {
        title: `Sample notification ${index + 1}`,
        message: `Fictional sample notification ${index + 1}.`,
        type: index % 4 === 0 ? "Warning" : "Info",
        isRead: index % 2 === 0,
        user: user._id,
        createdAt: new Date(Date.now() - index * 120000)
      } },
      upsert: true
    }
  })), { ordered: false });

  console.log("Seed complete. No existing records were deleted.");
  console.log("Seed login: operator@safecity.example / safecity-demo-2026 (change/remove after demonstration).");
  console.log("Inserted data targets at least 1,000 fictional documents; pre-existing matching records are kept.");
  process.exitCode = 0;
  await require("mongoose").disconnect();
}

seedData().catch(async error => {
  console.error(`Seed failed: ${error.message}`);
  await require("mongoose").disconnect();
  process.exitCode = 1;
});
