const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { parseReceipt } = require("../controllers/receiptsController");

router.post("/parse", authMiddleware, parseReceipt);    // protected route

module.exports = router;