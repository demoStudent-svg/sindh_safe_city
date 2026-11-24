require("dotenv").config();
const connectDatabase = require("../config/db");
const Camera = require("../models/Camera");

async function runExplain() {
  await connectDatabase();
  const filter = { cameraName: "Safe City Camera 1" };
  console.log("BEFORE: executionStats for cameraName equality query (before cameraName index is added)");
  console.dir(await Camera.find(filter).explain("executionStats"), { depth: null });
  await Camera.collection.createIndex({ cameraName: 1 }, { name: "camera_name_explain_idx" });
  console.log("AFTER: executionStats for the same query after adding cameraName index");
  console.dir(await Camera.find(filter).explain("executionStats"), { depth: null });
  console.log("Compare winningPlan and executionStats from this database run; no performance results are assumed here.");
  await require("mongoose").disconnect();
}

runExplain().catch(async error => {
  console.error(`Explain run failed: ${error.message}`);
  await require("mongoose").disconnect();
  process.exitCode = 1;
});
