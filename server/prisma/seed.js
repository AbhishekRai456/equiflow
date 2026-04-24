const prisma = require("./client");

async function main() {
  const categories = [
    "Food",
    "Travel",
    "Rent",
    "Entertainment",
    "Utilities",
    "Others",
  ];

  for (const name of categories) {
    // upsert ensures idempotency (would not fail if rerun)
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Categories seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());