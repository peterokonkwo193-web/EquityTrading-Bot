import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@bottrading.dev";
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: "Alex Morgan",
      settings: { create: {} },
    },
  });

  const accountsData = [
    { name: "Main Trading Account", accountNumber: "ACC-100234", balance: 12500.5 },
    { name: "Aggressive Growth", accountNumber: "ACC-100235", balance: 4200 },
  ];

  for (const data of accountsData) {
    const account = await prisma.account.upsert({
      where: { accountNumber: data.accountNumber },
      update: {},
      create: {
        userId: user.id,
        name: data.name,
        accountNumber: data.accountNumber,
        balance: data.balance,
      },
    });

    await prisma.tradingBot.upsert({
      where: { accountId: account.id },
      update: {},
      create: { accountId: account.id },
    });
  }

  console.log("Seed complete.");
  console.log(`Demo login -> email: ${DEMO_EMAIL}  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
