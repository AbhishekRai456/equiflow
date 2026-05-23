const prisma = require("../prisma/client");

const getBalances = async (req, res) => {
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

    // Fetch all members (so people with zero balance still appear in frontend)
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Fetch all unpaid splits for this group
    // (who owes the money (split.userId) and who they owe it to (expense.paidById))
    const unpaidSplits = await prisma.expenseSplit.findMany({
      where: {
        isPaid: false,
        expense: { groupId }, // filter by group via the related expense
      },
      include: {
        expense: {
          select: { paidById: true },
        },
      },
    });

    // Build Net Balance Map
    // structure: { userId: { user: {...}, net: number } }
    const balanceMap = {};

    // Initialise every member at zero
    for (const member of members) {
      balanceMap[member.userId] = {
        user: member.user,
        net: 0,
      };
    }

    // Process each unpaid split
    for (const split of unpaidSplits) {
      const payerId = split.expense.paidById; // person who is owed
      const debtorId = split.userId; // person who owes

      // Payer is owed this amount => their net goes up
      balanceMap[payerId].net += split.amount;

      // Debtor owes this amount => their net goes down
      balanceMap[debtorId].net -= split.amount;
    }

    // Greedy Debt Minimization Algorithm
    const creditors = []; // net > 0 => are owed money
    const debtors = []; // net < 0 => owe money

    for (const data of Object.values(balanceMap)) {
      const rounded = parseFloat(data.net.toFixed(2));
      if (rounded > 0.01) {
        creditors.push({ user: data.user, amount: rounded });
      } else if (rounded < -0.01) {
        debtors.push({ user: data.user, amount: Math.abs(rounded) });
      }
    }

    const settlements = [];
    let i = 0; // pointer into debtors list
    let j = 0; // pointer into creditors list

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Settle the smaller of what's owed vs what's due
      const amount = parseFloat(
        Math.min(debtor.amount, creditor.amount).toFixed(2),
      );

      settlements.push({
        from: debtor.user, // who pays
        to: creditor.user, // who receives
        amount,
      });

      // Reduce both balances by the settled amount
      debtor.amount = parseFloat((debtor.amount - amount).toFixed(2));
      creditor.amount = parseFloat((creditor.amount - amount).toFixed(2));

      // If a balance hits zero, advance that pointer
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    // Build the per-member summary for display
    const memberBalances = Object.values(balanceMap).map((data) => ({
      user: data.user,
      net: parseFloat(data.net.toFixed(2)),
    }));

    res.status(200).json({ memberBalances, settlements });
  } catch (error) {
    console.error("Get balances error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { getBalances };
