import twilio from "twilio";

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
}

interface NewPassengerAlert {
  name: string;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
}

async function sendAdminSms(body: string): Promise<void> {
  if (!ADMIN_ALERT_ENABLED || !ADMIN_ALERT_PHONE) return;
  if (ADMIN_ALERT_DRY_RUN) {
    console.log(`[ADMIN_ALERT] DRY_RUN — ${body}`);
    return;
  }
  try {
    if (!ADMIN_ALERT_SMS_FROM) { console.error('[ADMIN_ALERT] SMS failed: ADMIN_ALERT_SMS_FROM not configured'); return; }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const msg = await client.messages.create({ from: ADMIN_ALERT_SMS_FROM, to: ADMIN_ALERT_PHONE, body });
    console.log(`[ADMIN_ALERT] SMS sent sid=${msg.sid}`);
  } catch (err: any) {
    console.error(`[ADMIN_ALERT] SMS failed: ${err.message}`);
  }
}

export async function notifyAdminNewDriver(data: NewDriverAlert): Promise<void> {
  const parts = ['KAVIAR: novo parceiro cadastrado.', `Nome: ${data.name}`];
  if (data.phone) parts.push(`Tel: ${data.phone}`);
  if (data.email) parts.push(`Email: ${data.email}`);
  if (data.modality) parts.push(`Modalidade: ${data.modality}`);
  if (data.region) parts.push(`Região: ${data.region}`);
  parts.push('Acesse o Admin para aprovar.');
  await sendAdminSms(parts.join(' '));
}

export async function notifyAdminNewPassenger(data: NewPassengerAlert): Promise<void> {
  const parts = ['KAVIAR: novo passageiro cadastrado.', `Nome: ${data.name}`];
  if (data.phone) parts.push(`Tel: ${data.phone}`);
  if (data.email) parts.push(`Email: ${data.email}`);
  if (data.region) parts.push(`Região: ${data.region}`);
  await sendAdminSms(parts.join(' '));
}

function formatSms(data: NewContactAlert): string {
  return [
    "🔔 Novo contato KAVIAR",
    `Nome: ${data.name || "Desconhecido"}`,
    `Tel: ${data.phone}`,
    `Tipo: ${data.type}`,
    `Msg: ${data.message.substring(0, 80)}`,
    `Admin: https://app.kaviar.com.br/admin`,
  ].join("\n");
}

function normalizeDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function notifyAdminNewContact(data: NewContactAlert): Promise<void> {
  if (!ADMIN_ALERT_ENABLED || !ADMIN_ALERT_PHONE) return;

  // Anti-loop: não alertar se o contato é o próprio admin
  const incomingDigits = normalizeDigits(data.phone);
  const adminDigits = normalizeDigits(ADMIN_ALERT_PHONE);
  if (incomingDigits.endsWith(adminDigits.slice(-9))) {
    console.log(`[ADMIN_ALERT] Skipped: incoming phone matches admin alert phone`);
    return;
  }

  const body = formatSms(data);
  await sendAdminSms(body);
}
