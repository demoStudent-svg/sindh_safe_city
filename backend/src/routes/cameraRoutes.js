const express = require("express");
const { body, param, query } = require("express-validator");
const controller = require("../controllers/cameraController");
const requireAuth = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
const idRule = param("id").isMongoId().withMessage("Invalid camera identifier.");
function cameraRules(update = false) {
  const optional = chain => update ? chain.optional() : chain;
  return [
    optional(body("cameraId")).optional().trim().isLength({ min: 2, max: 40 }).withMessage("Camera ID must contain 2 to 40 characters."),
    optional(body("cameraName")).trim().isLength({ min: 2, max: 120 }).withMessage("Camera name is required and must be 120 characters or fewer."),
    optional(body("location")).trim().isLength({ min: 2, max: 200 }).withMessage("Location is required and must be 200 characters or fewer."),
    optional(body("cameraType")).optional().trim().isLength({ max: 80 }),
    optional(body("status")).optional().isIn(["Active", "Offline", "Maintenance"]),
    optional(body("description")).optional().trim().isLength({ max: 1000 })
  ];
}
const listRules = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["Active", "Offline", "Maintenance"]),
  query("q").optional().trim().isLength({ max: 100 })
];

router.use(requireAuth);
router.post("/", cameraRules(), validateRequest, controller.create);
router.get("/", listRules, validateRequest, controller.list);
router.get("/:id", idRule, validateRequest, controller.getById);
router.put("/:id", idRule, cameraRules(true), validateRequest, controller.update);
router.delete("/:id", idRule, validateRequest, controller.remove);

module.exports = router;
