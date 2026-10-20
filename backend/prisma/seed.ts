import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "equitycitadelassociates@gmail.com";
  
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  const passwordHash = await bcrypt.hash("AdminPassword123!", 10);

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash,
        role: "ADMIN",
        emailVerified: true,
        status: "ACTIVE"
      }
    });
    console.log(`Admin user (${adminEmail}) updated with password AdminPassword123!`);
    return;
  }
  
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: "System Administrator",
      currency: "USD",
      role: "ADMIN",
      emailVerified: true,
      settings: { create: {} }
    }
  });

  const num = Math.floor(10000000 + Math.random() * 90000000);
  await prisma.account.create({
    data: {
      userId: admin.id,
      name: "Main Account",
      accountNumber: `SIM-${num}`,
      balance: 100000.00,
      currency: "USD",
      status: "ACTIVE"
    }
  });

  console.log(`Admin user seeded successfully with email: ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
