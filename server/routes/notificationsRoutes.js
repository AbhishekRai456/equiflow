const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getNotifications, markAllRead } = require("../controllers/notificationsController");

router.get("/", authMiddleware, getNotifications);
router.patch("/read", authMiddleware, markAllRead);

module.exports = router;