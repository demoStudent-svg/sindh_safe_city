const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
const loginRules = [
  body("email").isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required.")
];

router.post("/signup", [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must contain 2 to 100 characters."),
  body("email").isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }).withMessage("Password must contain at least 8 characters.")
], validateRequest, authController.signup);
router.post("/login", loginRules, validateRequest, authController.login);
router.get("/me", requireAuth, authController.me);
router.post("/logout", requireAuth, authController.logout);
router.get("/logout", requireAuth, authController.logout);

module.exports = router;
