const prisma = require("../prisma/client");

// add expense
const addExpense = async (req, res) => {
  const { groupId } = req.params;
  const {
    description,
    amount,
    categoryId,
    splitType = "EQUAL",
    splits,
  } = req.body;
  const userId = req.userId; // the person who paid (from authMiddleware)

  // validation
  if (!description || !amount || !categoryId) {
    return res.status(400).json({
      error: "Description, amount, and category are required",
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

  const validSplitTypes = ["EQUAL", "CUSTOM", "PERCENTAGE"];
  if (!validSplitTypes.includes(splitType)) {
    return res.status(400).json({ error: "Invalid split type" });
  }

  // CUSTOM and PERCENTAGE both require a splits array from the client
  if (
    splitType != "EQUAL" &&
    (!splits || !Array.isArray(splits) || splits.length == 0)
  ) {
    return res.status(400).json({
      error: "Splits array is required for CUSTOM and PERCENTAGE split types",
    });
  }

  try {
    // authorization (only group members can add expenses)
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // fetch all members to split between
    const members = await prisma.groupMember.findMany({
      where: { groupId },
    });
    const memberIds = members.map((m) => m.userId);

    // build splitsData array based on split type
    let splitsData;

    if (splitType == "EQUAL") {
      const memberCount = members.length;

      // Equal Split calculation (round each share to 2 decimal places)
      const baseShare = parseFloat((parsedAmount / memberCount).toFixed(2));

      // assign the leftover cents to the payer (because rounding can create a tiny remainder)
      const totalFromShares = parseFloat((baseShare * memberCount).toFixed(2));
      const remainder = parseFloat((parsedAmount - totalFromShares).toFixed(2));

      splitsData = members.map((member) => {
        const isThePayer = member.userId == userId;
        return {
          userId: member.userId,
          amount: isThePayer
            ? parseFloat((baseShare + remainder).toFixed(2))
            : baseShare,
          isPaid: isThePayer,
        };
      });
    } else if (splitType == "CUSTOM") {
      // splits = [{ userId, amount}, ...]
      // validate all members are covered
      const splitUserIds = splits.map((s) => s.userId);
      const allCovered = memberIds.every((id) => splitUserIds.includes(id));
      if (!allCovered) {
        return res.status(400).json({
          error: "Every group member must have a custom split amount",
        });
      }

      // validate amounts sum to total
      const totalCustom = splits.reduce(
        (sum, s) => sum + parseFloat(s.amount || 0),
        0,
      );
      if (Math.abs(totalCustom - parsedAmount) > 0.01) {
        return res.status(400).json({
          error: `Custom amounts must add up to ₹${parsedAmount.toFixed(2)} (currently ₹${totalCustom.toFixed(2)})`,
        });
      }

      splitsData = splits.map((s) => ({
        userId: s.userId,
        amount: parseFloat(parseFloat(s.amount).toFixed(2)),
        isPaid: s.userId == userId, // since as of now we assume the person adding the expense is the payer
      }));
    } else if (splitType == "PERCENTAGE") {
      // splits = [{ userId, percentage}, ...]
      // validate all memebers are covered
      const splitUserIds = splits.map((s) => s.userId);
      const allCovered = memberIds.every((id) => splitUserIds.includes(id));
      if (!allCovered) {
        return res.status(400).json({
          error: "Every group member must have a percentage split amount",
        });
      }

      // Validate percentages sum to 100
      const totalPct = splits.reduce(
        (sum, s) => sum + parseFloat(s.percentage || 0),
        0,
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        return res.status(400).json({
          error: `Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%)`,
        });
      }

      // Calculate amounts from percentages
      const rawSplits = splits.map((s) => ({
        userId: s.userId,
        amount: parseFloat(
          ((parseFloat(s.percentage) / 100) * parsedAmount).toFixed(2),
        ),
        isThePayer: s.userId === userId,
      }));

      // Handle rounding remainder (assign to payer)
      const totalFromPct = rawSplits.reduce((sum, s) => sum + s.amount, 0);
      const remainder = parseFloat((parsedAmount - totalFromPct).toFixed(2));

      splitsData = rawSplits.map((s) => ({
        userId: s.userId,
        amount: s.isThePayer
          ? parseFloat((s.amount + remainder).toFixed(2))
          : s.amount,
        isPaid: s.isThePayer,
      }));
    }

    // Transaction (create expense + all splits "All-or-nothing")
    const newExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          description,
          amount: parsedAmount,
          splitType,
          groupId,
          paidById: userId,
          categoryId,
        },
      });

      // save all member splits to the database
      await tx.expenseSplit.createMany({
        data: splitsData.map((s) => ({ ...s, expenseId: expense.id })),
      });

      return expense;
    });

    // fetch the full expense to return (with related data)
    const fullExpense = await prisma.expense.findUnique({
      where: { id: newExpense.id }, // find the specific expense that we just made
      include: {
        // look up the user who paid, and give me their id, name and email
        paidBy: { select: { id: true, name: true, email: true } },

        // look up the category table and get category name
        category: { select: { id: true, name: true } },

        // look up all the rows in the ExpenseSplit table for this expense
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // notify other group members about the new expense
    try {
      const groupForNotif = await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      });

      const otherMemberIds = members
        .filter((m) => m.userId !== userId)
        .map((m) => m.userId);

      if (otherMemberIds.length > 0) {
        await prisma.notification.createMany({
          data: otherMemberIds.map((memberId) => ({
            userId: memberId,
            message: `${fullExpense.paidBy.name} added a ₹${parsedAmount.toFixed(2)} expense in ${groupForNotif.name}`,
            type: "EXPENSE_ADDED",
            groupId,
          })),
        });
      }
    } catch (notifError) {
      console.error("Failed to create expense notifications:", notifError);
    }

    res.status(201).json({ expense: fullExpense });
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// get expenses
const getExpenses = async (req, res) => {
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

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" }, // newest expenses first
    });

    res.status(200).json({ expenses });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { addExpense, getExpenses };
