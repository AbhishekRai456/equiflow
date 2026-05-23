const prisma = require("../prisma/client");

// add expense
const addExpense = async (req, res) => {
  const { groupId } = req.params;
  const { description, amount, categoryId } = req.body;
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

    const memberCount = members.length;

    // Equal Split calculation (round each share to 2 decimal places)
    const baseShare = parseFloat((parsedAmount / memberCount).toFixed(2));

    // assign the leftover cents to the payer (because rounding can create a tiny remainder)
    const totalFromShares = parseFloat((baseShare * memberCount).toFixed(2));
    const remainder = parseFloat((parsedAmount - totalFromShares).toFixed(2));

    // Transaction (create expense + all splits "All-or-nothing")
    const newExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          description,
          amount: parsedAmount,
          splitType: "EQUAL", // [TODO: CUSTOM/PERCENTAGE SPLIT]
          groupId,
          paidById: userId,
          categoryId,
        },
      });

      // build the splits array (one row per group member)
      const splitsData = members.map((member) => {
        const isThePayer = member.userId === userId;

        return {
          expenseId: expense.id,
          userId: member.userId,
          // payer absorbs the rounding remainder
          amount: isThePayer
            ? parseFloat((baseShare + remainder).toFixed(2))
            : baseShare,
          // payer's own split is already settled
          isPaid: isThePayer,
        };
      });

      // save all member splits to the database
      await tx.expenseSplit.createMany({ data: splitsData });

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
