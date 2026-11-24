const express = require("express");
const { body, param, query } = require("express-validator");
const controller = require("../controllers/incidentController");
const requireAuth = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validationMiddleware");

const router = express.Router();
const idRule = param("id").isMongoId().withMessage("Invalid incident identifier.");
function incidentRules(update = false) {
  const optional = chain => update ? chain.optional() : chain;
  return [
    optional(body("title")).trim().isLength({ min: 2, max: 160 }).withMessage("Title is required and must be 160 characters or fewer."),
    optional(body("incidentType")).trim().isLength({ min: 2, max: 100 }).withMessage("Incident type is required."),
    optional(body("description")).optional().trim().isLength({ max: 2000 }),
    optional(body("location")).trim().isLength({ min: 2, max: 200 }).withMessage("Location is required."),
    optional(body("camera")).optional({ nullable: true }).isMongoId().withMessage("Camera must be a valid camera ID."),
    optional(body("priority")).optional().isIn(["Low", "Medium", "High", "Critical"]),
    optional(body("status")).optional().isIn(["Open", "In Progress", "Resolved"])
  ];
}
const listRules = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().isIn(["Open", "In Progress", "Resolved"]),
  query("priority").optional().isIn(["Low", "Medium", "High", "Critical"]),
  query("incidentType").optional().trim().isLength({ max: 100 }),
  query("q").optional().trim().isLength({ max: 100 })
];

router.use(requireAuth);
router.post("/", incidentRules(), validateRequest, controller.create);
router.get("/", listRules, validateRequest, controller.list);
router.get("/:id", idRule, validateRequest, controller.getById);
router.put("/:id", idRule, incidentRules(true), validateRequest, controller.update);
router.delete("/:id", idRule, validateRequest, controller.remove);

module.exports = router;
