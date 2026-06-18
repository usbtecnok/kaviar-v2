import twilio from "twilio";
import { prisma } from "../lib/prisma";

const ADMIN_ALERT_ENABLED = process.env.ADMIN_ALERT_ENABLED === "true";
const ADMIN_ALERT_PHONE = process.env.ADMIN_ALERT_PHONE || "";
const ADMIN_ALERT_DRY_RUN = process.env.ADMIN_ALERT_DRY_RUN !== "false"; // default true
const ADMIN_ALERT_SMS_FROM = process.env.ADMIN_ALERT_SMS_FROM || "";

interface NewContactAlert {
  phone: string;
  name: string | null;
  message: string;
  type: string;
  conversationId: string;
}

interface NewDriverAlert {
  name: string;
  phone?: string | null;
  email?: string | null;
  modality?: string | null;
  region?: string | null;
  territoryId?: string | null;
}

interface NewPassengerAlert {
  name: string;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
  territoryId?: string | null;
}

async function sendSmsTo(to: string, body: string): Promise<boolean> {
  if (ADMIN_ALERT_DRY_RUN) {
    console.log(`[ADMIN_ALERT] DRY_RUN to=${to} — ${body}`);
    return true;
  }
  try {
    if (!ADMIN_ALERT_SMS_FROM) { console.error('[ADMIN_ALERT] SMS failed: ADMIN_ALERT_SMS_FROM not configured'); return false; }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const msg = await client.messages.create({ from: ADMIN_ALERT_SMS_FROM, to, body });
    console.log(`[ADMIN_ALERT] SMS sent sid=${msg.sid} to=${to}`);
    return true;
  } catch (err: any) {
    console.error(`[ADMIN_ALERT] SMS failed to=${to}: ${err.message}`);
    return false;
  }
}

function normalizeDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

async function getManagerPhonesForTerritory(territoryId: string, type: 'driver' | 'passenger'): Promise<string[]> {
  try {
    const managers = await prisma.admins.findMany({
      where: {
        is_active: true,
        sms_alerts_enabled: true,
        phone: { not: null },
        role: { in: ['TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'] },
        territory_access: { some: { territory_id: territoryId } },
        ...(type === 'driver' ? { notify_new_drivers: true } : { notify_new_passengers: true }),
      },
      select: { phone: true },
    });
    return managers.map(m => m.phone!).filter(Boolean);
  } catch (err: any) {
    console.error(`[MANAGER_ALERT] lookup failed: ${err.message}`);
    return [];
  }
}

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

async function sendToAll(phones: string[], body: string): Promise<void> {
  const seen = new Set<string>();
  for (const phone of phones) {
    const key = normalizePhoneE164(phone);
    if (seen.has(key)) continue;
    seen.add(key);
    await sendSmsTo(phone, body);
  }
}

export async function notifyAdminNewDriver(data: NewDriverAlert): Promise<void> {
  if (!ADMIN_ALERT_ENABLED) return;

  const parts = [`KAVIAR: novo parceiro${data.region ? ` em ${data.region}` : ''}.`, `Nome: ${data.name}.`];
  if (data.modality) parts.push(`Modalidade: ${data.modality}.`);
  parts.push('Acesse o Admin para aprovar.');
  const body = parts.join(' ');

  const phones: string[] = [];
  if (ADMIN_ALERT_PHONE) phones.push(ADMIN_ALERT_PHONE);

  // Manager lookup
  if (data.territoryId) {
    const managerPhones = await getManagerPhonesForTerritory(data.territoryId, 'driver');
    if (managerPhones.length > 0) {
      phones.push(...managerPhones);
      console.log(`[MANAGER_ALERT] sent driver alert to ${managerPhones.length} manager(s) territory=${data.territoryId}`);
    } else {
      console.log(`[MANAGER_ALERT] no manager found for territory=${data.territoryId}`);
    }
  }

  await sendToAll(phones, body);
}

export async function notifyAdminNewPassenger(data: NewPassengerAlert): Promise<void> {
  if (!ADMIN_ALERT_ENABLED) return;

  const parts = [`KAVIAR: novo passageiro${data.region ? ` em ${data.region}` : ''}.`, `Nome: ${data.name}.`];
  if (data.phone) parts.push(`Tel: ${data.phone}.`);
  const body = parts.join(' ');

  const phones: string[] = [];
  if (ADMIN_ALERT_PHONE) phones.push(ADMIN_ALERT_PHONE);

  // Manager lookup (only if notify_new_passengers enabled)
  if (data.territoryId) {
    const managerPhones = await getManagerPhonesForTerritory(data.territoryId, 'passenger');
    if (managerPhones.length > 0) {
      phones.push(...managerPhones);
      console.log(`[MANAGER_ALERT] sent passenger alert to ${managerPhones.length} manager(s) territory=${data.territoryId}`);
    }
  }

  await sendToAll(phones, body);
}

export async function notifyAdminNewContact(data: NewContactAlert): Promise<void> {
  if (!ADMIN_ALERT_ENABLED || !ADMIN_ALERT_PHONE) return;

  const incomingDigits = normalizeDigits(data.phone);
  const adminDigits = normalizeDigits(ADMIN_ALERT_PHONE);
  if (incomingDigits.endsWith(adminDigits.slice(-9))) return;

  const body = [
    "🔔 Novo contato KAVIAR",
    `Nome: ${data.name || "Desconhecido"}`,
    `Tel: ${data.phone}`,
    `Tipo: ${data.type}`,
    `Msg: ${data.message.substring(0, 80)}`,
  ].join("\n");

  await sendSmsTo(ADMIN_ALERT_PHONE, body);
}
