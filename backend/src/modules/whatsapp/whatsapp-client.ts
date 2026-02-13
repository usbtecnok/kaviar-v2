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

export function normalizeWhatsAppTo(to: string): string {
  const raw = (to || "").trim();
  
  // Se já tem prefixo whatsapp:, extrair número
  const phoneOnly = raw.startsWith("whatsapp:") ? raw.substring(9) : raw;
  
  // Limpar: manter apenas + e dígitos
  const cleaned = phoneOnly.replace(/[^\d+]/g, "");
  
  // Validar formato E.164 (deve começar com +)
  if (!cleaned.startsWith("+")) {
    throw new Error(`[whatsapp] Invalid To phone (missing +): ${to}`);
  }
  
  // Validar comprimento mínimo (+ e pelo menos 10 dígitos)
  if (cleaned.length < 11) {
    throw new Error(`[whatsapp] Invalid To phone (too short): ${to}`);
  }
  
  return `whatsapp:${cleaned}`;
}
