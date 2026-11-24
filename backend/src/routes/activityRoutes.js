const express = require("express");
const { param } = require("express-validator");
const controller = require("../controllers/activityController");
const requireAuth = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(requireAuth);
router.get("/", controller.listActivity);
router.get("/notifications", controller.listNotifications);
router.patch("/notifications/:id/read", param("id").isMongoId(), validateRequest, controller.markRead);
module.exports = router;
