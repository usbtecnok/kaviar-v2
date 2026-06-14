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
  if (!ADMIN_ALERT_ENABLED || !ADMIN_ALERT_PHONE) {
    return;
  }

  // Anti-loop: não alertar se o contato é o próprio admin
  const incomingDigits = normalizeDigits(data.phone);
  const adminDigits = normalizeDigits(ADMIN_ALERT_PHONE);
  if (incomingDigits.endsWith(adminDigits.slice(-9))) {
    console.log(`[ADMIN_ALERT] Skipped: incoming phone matches admin alert phone`);
    return;
  }

  const body = formatSms(data);

  if (ADMIN_ALERT_DRY_RUN) {
    console.log(`[ADMIN_ALERT] DRY_RUN — SMS that would be sent to ${ADMIN_ALERT_PHONE}:`);
    console.log(body);
    console.log(`[ADMIN_ALERT] DRY_RUN — conversation_id=${data.conversationId}`);
    return;
  }

  // Envio real via Twilio SMS
  try {
    if (!ADMIN_ALERT_SMS_FROM) {
      console.error(`[ADMIN_ALERT] SMS failed: ADMIN_ALERT_SMS_FROM not configured conv=${data.conversationId}`);
      return;
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const msg = await client.messages.create({
      from: ADMIN_ALERT_SMS_FROM,
      to: ADMIN_ALERT_PHONE,
      body,
    });
    console.log(`[ADMIN_ALERT] SMS sent sid=${msg.sid} to=${ADMIN_ALERT_PHONE} conv=${data.conversationId}`);
  } catch (err: any) {
    console.error(`[ADMIN_ALERT] SMS failed: ${err.message} conv=${data.conversationId}`);
  }
}
