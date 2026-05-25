const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getSpendingInsights } = require("../controllers/insightsController");

router.get("/", authMiddleware, getSpendingInsights);

module.exports = router;