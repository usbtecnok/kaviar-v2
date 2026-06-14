import { prisma } from "../lib/prisma";

export async function isMotoPassengerEnabled(territoryId?: string): Promise<boolean> {
  try {
    const flag = await prisma.feature_flags.findUnique({ where: { key: "ENABLE_MOTO_PASSENGER" } });
    if (!flag?.enabled) return false;

    if (territoryId) {
      const territory = await prisma.operational_territories.findUnique({
        where: { id: territoryId },
        select: { moto_passenger_enabled: true },
      });
      if (!territory?.moto_passenger_enabled) return false;
    }

    return true;
  } catch (err: any) {
    console.error("[MOTO_PASSENGER_FLAG] check failed:", err.message);
    return false;
  }
}
