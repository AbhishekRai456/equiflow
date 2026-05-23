const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createGroup,
  getMyGroups,
  addMember,
  getGroupById,
} = require("../controllers/groupController");
const {
  addExpense,
  getExpenses,
} = require("../controllers/expensesController");
const { getBalances } = require("../controllers/balancesController");

// group routes are protected as authMiddleware runs first on every one
// If JWT is missing/invalid, authMiddleware sends 401 and controller never runs
router.post("/", authMiddleware, createGroup);
router.get("/", authMiddleware, getMyGroups);
router.post("/:groupId/members", authMiddleware, addMember);
router.get("/:groupId", authMiddleware, getGroupById);
router.post("/:groupId/expenses", authMiddleware, addExpense);
router.get("/:groupId/expenses", authMiddleware, getExpenses);
router.get("/:groupId/balances", authMiddleware, getBalances);

module.exports = router;
