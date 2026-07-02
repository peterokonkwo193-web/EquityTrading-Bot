import { prisma } from "../../lib/prisma";
import { UpdateSettingsInput } from "./settings.schema";

export async function getSettings(userId: string) {
  const existing = await prisma.settings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.settings.create({ data: { userId } });
}

export async function updateSettings(userId: string, input: UpdateSettingsInput) {
  await getSettings(userId);
  return prisma.settings.update({ where: { userId }, data: input });
}
