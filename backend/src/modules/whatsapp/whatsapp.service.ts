import { getTwilioClient, getWhatsAppFrom, normalizeWhatsAppTo, WHATSAPP_ENV } from "./whatsapp-client";
import { getWhatsAppContentSid, WhatsAppTemplateName } from "./whatsapp-templates";

type Vars = Record<string, string | number | boolean | null | undefined>;

function toContentVariables(vars: Vars): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined || v === null) continue;
    clean[String(k)] = String(v);
  }
  return clean;
}

export class WhatsAppService {
  async sendTemplate(params: { to: string; template: WhatsAppTemplateName; variables?: Vars }) {
    if (!WHATSAPP_ENV.enabled) return { skipped: true };

    const client = getTwilioClient();
    const from = getWhatsAppFrom();
    const to = normalizeWhatsAppTo(params.to);

    const contentSid = getWhatsAppContentSid(params.template);
    if (!contentSid || contentSid.trim() === '') {
      throw new Error(`[whatsapp] Missing contentSid for template: ${params.template}`);
    }

    const contentVariables = toContentVariables(params.variables ?? {});
    
    // Log para debug (sem expor dados sensíveis)
    console.log('[whatsapp] Sending template:', {
      template: params.template,
      contentSid,
      variablesKeys: Object.keys(contentVariables),
      variablesCount: Object.keys(contentVariables).length
    });

    // Twilio SDK espera contentVariables como string JSON
    const msg = await client.messages.create({ 
      from, 
      to, 
      contentSid, 
      contentVariables: JSON.stringify(contentVariables)
    });
    return { sid: msg.sid };
  }
}
