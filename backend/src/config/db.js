const mongoose = require("mongoose");
const dns = require('dns');
dns.setServers([
  '1.1.1.1',
  '8.8.8.8'
])

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "";
  if (!uri || uri.includes("YOUR_USERNAME") || uri.includes("YOUR_CLUSTER")) {
    throw new Error("Set a real MongoDB Atlas MONGODB_URI in backend/.env before starting the API.");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected.");
}

module.exports = connectDatabase;
