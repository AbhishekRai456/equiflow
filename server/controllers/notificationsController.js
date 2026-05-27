const prisma = require("../prisma/client");

// get Notifications
const getNotifications = async (req, res) => {
  const userId = req.userId;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20, // last 20 only
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// mark all as read
const markAllRead = async (req, res) => {
  const userId = req.userId;

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { getNotifications, markAllRead };
