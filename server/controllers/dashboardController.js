const prisma = require("../prisma/client");

const getDashboard = async (req, res) => {
  const userId = req.userId;

  try {
    // Get all groups logged-in user belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: { select: { id: true, name: true, createdAt: true } },
      },
    });

    // If user has no groups, return zeroed-out summary immediately
    if (memberships.length === 0) {
      return res.status(200).json({
        overallNet: 0,
        totalOwedToMe: 0,
        totalIOwe: 0,
        groups: [],
        byCategory: [],
        byMonth: [],
      });
    }

    const groupIds = memberships.map((m) => m.groupId);

    // Fetch user's own ExpenseSplit rows
    const personalSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: userId,
        expense: { groupId: { in: groupIds } },
      },
      include: {
        expense: {
          select: { categoryId: true, createdAt: true },
        },
      },
    });

    // Aggregate by category and month
    const categoryTotals = {};
    const monthTotals = {};

    for (const split of personalSplits) {
      // category aggregation
      const catId = split.expense.categoryId;
      categoryTotals[catId] = (categoryTotals[catId] || 0) + split.amount;

      // monthly aggregation
      const monthKey = split.expense.createdAt.toISOString().slice(0, 7);
      monthTotals[monthKey] = (monthTotals[monthKey] || 0) + split.amount;
    }

    // Fetch category names for the ids user used
    const usedCategoryIds = Object.keys(categoryTotals);
    const categoriesForDashboard = await prisma.category.findMany({
      where: { id: { in: usedCategoryIds } },
    });

    const categoryNameMap = {};
    categoriesForDashboard.forEach((c) => {
      categoryNameMap[c.id] = c.name;
    });

    const byCategory = Object.entries(categoryTotals)
      .map(([catId, total]) => ({
        category: categoryNameMap[catId] || "Unknown",
        total: parseFloat(total.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total); // highest spending first

    const byMonth = Object.entries(monthTotals)
      .map(([month, total]) => ({
        month,
        total: parseFloat(total.toFixed(2)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // chronological order

    // Fetch splits where money is owed to the logged-in user
    // (expenses logged-in user paid for, split rows belonging to other members)
    const owedToMeSplits = await prisma.expenseSplit.findMany({
      where: {
        isPaid: false,
        expense: {
          groupId: { in: groupIds },
          paidById: userId, // paid by the logged-in user
        },
      },
      select: {
        amount: true,
        expense: { select: { groupId: true } },
      },
    });

    // Fetch splits where the logged-in user owes money
    // (expenses others paid, logged-in user's split row)
    const iOweSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: userId,
        isPaid: false,
        expense: {
          groupId: { in: groupIds },
          NOT: { paidById: userId }, // extra safety to skip user's own splits in expenses they paid for (because anyways those splits were marked as isPaid = true)
        },
      },
      select: {
        amount: true,
        expense: { select: { groupId: true } },
      },
    });

    // Fetch all settlements involving the logged-in user
    const settlements = await prisma.settlement.findMany({
      where: {
        groupId: { in: groupIds },
        OR: [{ payerId: userId }, { receiverId: userId }],
      },
      select: {
        amount: true,
        groupId: true,
        payerId: true,
        receiverId: true,
      },
    });

    // Build per-group net balance map
    const groupNetMap = {};
    for (const m of memberships) {
      groupNetMap[m.groupId] = { group: m.group, net: 0 };
    }

    // Others owe user => user's net goes up
    for (const split of owedToMeSplits) {
      groupNetMap[split.expense.groupId].net += split.amount;
    }

    // User owes others => user's net goes down
    for (const split of iOweSplits) {
      groupNetMap[split.expense.groupId].net -= split.amount;
    }

    // Settlements adjust the net (same ledger logic as balancesController)
    for (const s of settlements) {
      if (s.payerId === userId) {
        groupNetMap[s.groupId].net += s.amount; // user paid => net goes up
      } else {
        groupNetMap[s.groupId].net -= s.amount; // user received => net goes down
      }
    }

    // Build the final groups array
    const groups = Object.values(groupNetMap).map((item) => ({
      group: item.group,
      net: parseFloat(item.net.toFixed(2)),
    }));

    // Aggregate totals using reduce
    // Only count groups with a positive net (money is owed to the user)
    const totalOwedToMe = groups
      .filter((g) => g.net > 0.01)
      .reduce((sum, g) => sum + g.net, 0);

    // Only count groups with a negative net (user owes money)
    const totalIOwe = groups
      .filter((g) => g.net < -0.01)
      .reduce((sum, g) => sum + Math.abs(g.net), 0);

    res.status(200).json({
      overallNet: parseFloat((totalOwedToMe - totalIOwe).toFixed(2)),
      totalOwedToMe: parseFloat(totalOwedToMe.toFixed(2)),
      totalIOwe: parseFloat(totalIOwe.toFixed(2)),
      groups,
      byCategory,
      byMonth
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { getDashboard };
