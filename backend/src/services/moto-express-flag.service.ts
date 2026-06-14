import { prisma } from "../lib/prisma";

export async function isMotoExpressEnabled(territoryId?: string): Promise<boolean> {
  try {
    const flag = await prisma.feature_flags.findUnique({ where: { key: "ENABLE_MOTO_EXPRESS" } });
    if (!flag?.enabled) return false;

    if (territoryId) {
      const territory = await prisma.operational_territories.findUnique({
        where: { id: territoryId },
        select: { moto_express_enabled: true },
      });
      if (!territory?.moto_express_enabled) return false;
    }

    return true;
  } catch (err: any) {
    console.error("[MOTO_EXPRESS_FLAG] check failed:", err.message);
    return false;
  }
}
