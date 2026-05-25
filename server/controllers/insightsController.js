const prisma = require("../prisma/client");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getSpendingInsights = async (req, res) => {
  const userId = req.userId;

  try {
    // Fetch user's groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true } } },
    });

    if (memberships.length === 0) {
      return res.status(200).json({
        insights: [
          "You aren't part of any groups yet! Create or join one to unlock Smart Insights.",
        ],
      });
    }

    const groupIds = memberships.map((m) => m.groupId);

    // Fetch user's personal splits (their actual spending)
    const personalSplits = await prisma.expenseSplit.findMany({
      where: {
        userId,
        expense: { groupId: { in: groupIds } },
      },
      include: {
        expense: {
          select: { categoryId: true, createdAt: true, groupId: true },
        },
      },
    });

    if (personalSplits.length === 0) {
      return res.status(200).json({
        insights: [
          "No spending recorded yet. Once expenses are tracked in your groups, your Smart Insights will appear here!",
        ],
      });
    }

    // Find most active group by user's actual spending in each group
    const spendingByGroup = {};
    for (const split of personalSplits) {
      const gId = split.expense.groupId;
      spendingByGroup[gId] = (spendingByGroup[gId] || 0) + split.amount;
    }

    // Sort descending
    const mostActiveGroupId = Object.entries(spendingByGroup).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];

    const mostActiveGroupName =
      memberships.find((m) => m.groupId === mostActiveGroupId)?.group?.name ||
      "N/A";

    // Compute current and last month totals
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);

    // Category totals this month vs last month
    const thisMonthByCategory = {};
    const lastMonthByCategory = {};
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;

    for (const split of personalSplits) {
      const month = split.expense.createdAt.toISOString().slice(0, 7);
      const catId = split.expense.categoryId;

      if (month === currentMonthKey) {
        thisMonthByCategory[catId] =
          (thisMonthByCategory[catId] || 0) + split.amount;
        thisMonthTotal += split.amount;
      } else if (month === lastMonthKey) {
        lastMonthByCategory[catId] =
          (lastMonthByCategory[catId] || 0) + split.amount;
        lastMonthTotal += split.amount;
      }
    }

    // Fetch category names for the ids we used
    const allCatIds = [
      ...new Set([
        ...Object.keys(thisMonthByCategory),
        ...Object.keys(lastMonthByCategory),
      ]),
    ];
    const categories = await prisma.category.findMany({
      where: { id: { in: allCatIds } },
    });
    const catNameMap = {};
    categories.forEach((c) => {
      catNameMap[c.id] = c.name;
    });

    // Format category breakdowns as readable strings
    const formatCategoryBreakdown = (catMap) =>
      Object.entries(catMap)
        .map(
          ([id, amt]) => `${catNameMap[id] || "Unknown"}: ₹${amt.toFixed(0)}`,
        )
        .join(", ") || "no data";

    // Build the prompt

    const prompt = `
    You are a financial assistant for a shared expense splitting app.
    Analyse this user's spending data and generate exactly 3 short, specific insights.

    SPENDING DATA:
    - This month (${currentMonthKey}) total: ₹${thisMonthTotal.toFixed(0)}
    - Last month (${lastMonthKey}) total: ₹${lastMonthTotal.toFixed(0)}
    - This month by category: ${formatCategoryBreakdown(thisMonthByCategory)}
    - Last month by category: ${formatCategoryBreakdown(lastMonthByCategory)}
    - Number of groups: ${memberships.length}
    - Most active group: ${mostActiveGroupName}

    RULES:
    - Each insight must be under 15 words
    - Be specific with numbers or percentages where the data supports it
    - Be observational, not judgmental
    - If this month has no data, comment on last month's patterns
    - Return ONLY a valid JSON array of exactly 3 strings, no other text

    EXAMPLE OUTPUT:
    ["Food spending is your biggest expense at 45% of total.", "You spent 30% more this month than last month.", "Most of your expenses are in the Goa Trip group."]
    `;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Safely parse the JSON response
    // Strip any markdown code fences Gemini sometimes adds
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const insights = JSON.parse(cleaned);

    // Validate it's an array of strings before sending
    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    res.status(200).json({ insights });
  } catch (error) {
    console.error("Insights error:", error);
    // Don't fail the whole dashboard (return a fallback)
    res.status(200).json({
      insights: ["Could not generate insights right now. Try again later."],
    });
  }
};

module.exports = { getSpendingInsights };
