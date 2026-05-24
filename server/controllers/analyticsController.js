const prisma = require("../prisma/client");

const getGroupAnalytics = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Include group name so the frontend page header later doesn't need a second fetch
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    // Spending by category
    const byCategoryRaw = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { groupId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } }, // highest spending first
    });

    // get category names for category ids
    const categoryIds = byCategoryRaw.map((row) => row.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    // lookup map: { categoryId → categoryName }
    const categoryNameMap = {};
    categories.forEach((cat) => {
      categoryNameMap[cat.id] = cat.name;
    });

    const byCategory = byCategoryRaw.map((row) => ({
      category: categoryNameMap[row.categoryId] || "Unknown",
      total: parseFloat(row._sum.amount.toFixed(2)),
    }));

    // Monthly trend
    // (Prisma groupBy can't truncate dates, so fetch raw and aggregate in JS)
    const allExpenses = await prisma.expense.findMany({
      where: { groupId },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by "YYYY-MM" string
    const monthlyMap = {};
    for (const expense of allExpenses) {
      const monthKey = expense.createdAt.toISOString().slice(0, 7);
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + expense.amount;
    }

    const byMonth = Object.entries(monthlyMap).map(([month, total]) => ({
      month, // "2025-05" — used as sort key
      total: parseFloat(total.toFixed(2)),
    }));

    // Summary stats
    const totalSpent = byCategory.reduce((sum, c) => sum + c.total, 0);

    res.status(200).json({
      groupName: group.name,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      expenseCount: allExpenses.length,
      byCategory,
      byMonth,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { getGroupAnalytics };
