function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ success: false, message: error.message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Validation failed.", errors: Object.values(error.errors).map(item => item.message) });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "record";
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }
  if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid record identifier." });
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "Internal server error."
  });
}

module.exports = { notFound, errorHandler };
