require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500")
  .split(",")
  .map(origin => origin.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." }
}));

app.get("/api/health", (req, res) => res.json({ success: true, message: "Sindh Safe City API is ready." }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/cameras", require("./routes/cameraRoutes"));
app.use("/api/incidents", require("./routes/incidentRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/activity", require("./routes/activityRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/assistant", require("./routes/assistantRoutes"));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
