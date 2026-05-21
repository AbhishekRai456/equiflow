const prisma = require("../prisma/client");

const createGroup = async (req, res) => {
  const { name } = req.body;
  const userId = req.userId; // set by authMiddleware after verifying JWT

  if (!name) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    // create the group row
    const group = await prisma.group.create({
      data: {
        name: name,
        createdBy: userId,
      },
    });

    // add the creator as the first member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: userId,
      },
    });

    res.status(201).json({ group });
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const getMyGroups = async (req, res) => {
  const userId = req.userId;

  try {
    // retrieve user's memberships alongside group details and member lists
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        // group details
        group: {
          include: {
            // member list
            members: true,
          },
        },
      },
    });

    // reshape the data for frontend
    const groups = memberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      createdAt: membership.group.createdAt,
      memberCount: membership.group.members.length,
    }));

    res.status(200).json({ groups });
  } catch (err) {
    console.error("Get groups error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const addMember = async (req, res) => {
  const { groupId } = req.params; // comes from URL /groups/:groupId/members
  const { email } = req.body;
  const userId = req.userId;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // verify the person adding a member is actually in this group
    const requestMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId }, // composite unique key from schema
      },
    });

    if (!requestMembership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd)
      return res.status(404).json({ error: "No user found with that email" });

    // check is the user to add is already in the group
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: groupId, userId: userToAdd.id },
      },
    });

    if (existingMember)
      return res
        .status(400)
        .json({ error: "User is already a member of this group" });

    // Add user to add as a member
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userToAdd.id,
      },
    });

    res.status(201).json({
      message: "Member added successfully",
      user: {
        id: userToAdd.id,
        name: userToAdd.name,
        email: userToAdd.email,
      },
    });
  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const getGroupById = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // verify the requesting user is actually in this group
    // Someone shouldn't be able to fetch details of a group they don't belong to
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    // Fetch the group with its members and each member's user info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { joinedAt: "asc" }, // creator appears first (they joined first)
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ group });
  } catch (error) {
    console.error("Get group by id error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { createGroup, getMyGroups, addMember, getGroupById };
