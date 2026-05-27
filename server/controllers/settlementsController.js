const prisma = require("../prisma/client");

// record a settlement
const recordSettlement = async (req, res) => {
  const { groupId } = req.params;
  const { payerId, receiverId, amount } = req.body;
  const userId = req.userId;

  if (!payerId || !receiverId || !amount) {
    return res
      .status(400)
      .json({ error: "payerId, receiverId, and amount are required" });
  }

  if (payerId === receiverId) {
    return res
      .status(400)
      .json({ error: "Payer and receiver cannot be the same person" });
  }

  if (userId !== payerId && userId !== receiverId) {
    return res
      .status(403)
      .json({ error: "Only the payer or receiver can record this settlement" });
  }

  try {
    const [payerMembership, receiverMembership] = await Promise.all([
      prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: payerId } },
      }),
      prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: receiverId } },
      }),
    ]);

    if (!payerMembership || !receiverMembership) {
      return res
        .status(400)
        .json({ error: "Both users must be members of this group" });
    }

    // Ledger Approach: just record the financial event (no touching ExpenseSplit rows)
    // the balance calculation will factor this directly
    await prisma.settlement.create({
      data: {
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        groupId,
        payerId,
        receiverId,
      },
    });

    // notify the receiver that they've been paid
    try {
      const [payer, groupForNotif] = await Promise.all([
        prisma.user.findUnique({
          where: { id: payerId },
          select: { name: true },
        }),
        prisma.group.findUnique({
          where: { id: groupId },
          select: { name: true },
        }),
      ]);

      await prisma.notification.create({
        data: {
          userId: receiverId,
          message: `${payer.name} paid you ₹${parseFloat(amount).toFixed(2)} in ${groupForNotif.name}`,
          type: "SETTLEMENT",
          groupId,
        },
      });
    } catch (notifError) {
      console.error("Failed to create settlement notification:", notifError);
    }

    res.status(201).json({ message: "Settlement recorded successfully" });
  } catch (error) {
    console.error("Record settlement error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// get settlement history
const getSettlements = async (req, res) => {
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

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ settlements });
  } catch (error) {
    console.error("Get settlements error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { recordSettlement, getSettlements };
