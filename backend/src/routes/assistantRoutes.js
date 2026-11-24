const express = require("express");
const { body } = require("express-validator");
const controller = require("../controllers/assistantController");
const requireAuth = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
router.post("/query", requireAuth, body("question").trim().isLength({ min: 2, max: 500 }), validateRequest, controller.query);
module.exports = router;
