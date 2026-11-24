const express = require("express");
const controller = require("../controllers/activityController");
const requireAuth = require("../middleware/authMiddleware");
const { param } = require("express-validator");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
router.use(requireAuth);
router.get("/", controller.listNotifications);
router.patch("/:id/read", param("id").isMongoId(), validateRequest, controller.markRead);
module.exports = router;
