import twilio from "twilio";

function must(v: string | undefined, key: string): string {
  if (!v || !v.trim()) throw new Error(`[whatsapp] missing env: ${key}`);
  return v.trim();
}

export const WHATSAPP_ENV = {
  enabled: (process.env.TWILIO_WHATSAPP_ENABLED ?? "false").toLowerCase() === "true",
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_WHATSAPP_FROM,
};

export function getTwilioClient() {
  return twilio(
    must(WHATSAPP_ENV.accountSid, "TWILIO_ACCOUNT_SID"),
    must(WHATSAPP_ENV.authToken, "TWILIO_AUTH_TOKEN")
  );
}

export function getWhatsAppFrom(): string {
  return must(WHATSAPP_ENV.from, "TWILIO_WHATSAPP_FROM");
}

export function normalizeWhatsAppTo(e164: string): string {
  const to = e164.trim();
  return to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
}
