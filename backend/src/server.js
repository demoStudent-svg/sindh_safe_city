require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/db");

const port = Number(process.env.PORT) || 5000;

async function start() {
  const secret = process.env.JWT_SECRET || "";
  if (secret.includes("CHANGE_THIS") || secret.length < 32) {
    throw new Error("Set JWT_SECRET to a private random value of at least 32 characters in backend/.env.");
  }
  await connectDatabase();
  app.listen(port, () => console.log(`Sindh Safe City API listening on port ${port}.`));
}

start().catch(error => {
  console.error(`Startup failed: ${error.message}`);
  process.exitCode = 1;
});
