import { getTwilioClient, getWhatsAppFrom, normalizeWhatsAppTo, WHATSAPP_ENV } from "./whatsapp-client";
import { getWhatsAppContentSid, WhatsAppTemplateName } from "./whatsapp-templates";

type Vars = Record<string, string | number | boolean | null | undefined>;

function toContentVariables(vars: Vars): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    // Garantir sempre string não-vazia
    clean[String(k)] = String(v ?? '').replace(/[\n\r\t]/g, ' ').replace(/ {4,}/g, '   ') || ' ';
  }
  const json = JSON.stringify(clean);
  console.log('[whatsapp] toContentVariables:', { 
    inputKeys: Object.keys(vars), 
    outputKeys: Object.keys(clean),
    json: json.substring(0, 300)
  });
  return json;
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
    
    // Mascarar tokens/URLs mas manter estrutura
    const maskSensitive = (str: string) => str.replace(/(token=|invites\?token=)[^"&}]+/gi, '$1***MASKED***');
    
    // Log CRÍTICO antes do Twilio call
    console.log('[TWILIO_CALL_DEBUG]', JSON.stringify({
      contentSid,
      contentSidLength: contentSid.length,
      contentVariablesType: typeof contentVariables,
      contentVariablesLength: contentVariables.length,
      contentVariablesRaw: maskSensitive(contentVariables),
      from,
      toMasked: to.substring(0, 15) + '***'
    }));

    // contentVariables já é string JSON
    const msg = await client.messages.create({ 
      from, 
      to, 
      contentSid, 
      contentVariables
    });
    return { sid: msg.sid };
  }
}
