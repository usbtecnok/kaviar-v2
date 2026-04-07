import { prisma } from '../lib/prisma';

const CHARS = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no O/I/L

function generateCode(name: string): string {
  const prefix = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const suffix = Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  return prefix + suffix;
}

export async function uniqueCode(name: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode(name);
    const exists = await prisma.referral_agents.findFirst({ where: { referral_code: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique referral code');
}

/** Normaliza telefone para apenas dígitos, sem +55 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
}
