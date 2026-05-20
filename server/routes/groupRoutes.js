const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createGroup,
  getMyGroups,
  addMember,
} = require("../controllers/groupController");

// group routes are protected as authMiddleware runs first on every one
// If JWT is missing/invalid, authMiddleware sends 401 and controller never runs
router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getMyGroups);
router.post("/:groupId/members", authMiddleware, addMember);

module.exports = router;
