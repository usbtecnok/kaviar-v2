import { getTwilioClient, getWhatsAppFrom, normalizeWhatsAppTo, WHATSAPP_ENV } from "./whatsapp-client";
import { getWhatsAppContentSid, WhatsAppTemplateName } from "./whatsapp-templates";

type Vars = Record<string, string | number | boolean | null | undefined>;

function toContentVariables(vars: Vars): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    const value = String(v ?? '');
    // Twilio rejeita: empty string, null, newlines, tabs, 4+ espaços consecutivos
    if (!value || value.trim() === '') {
      clean[String(k)] = ' '; // espaço único como fallback
    } else {
      // Remove newlines, tabs, reduz espaços múltiplos
      clean[String(k)] = value.replace(/[\n\r\t]/g, ' ').replace(/ {4,}/g, '   ');
    }
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
    
    // Log para debug (sem expor dados sensíveis)
    console.log('[whatsapp] Sending template:', {
      template: params.template,
      contentSid,
      contentVariablesType: typeof contentVariables,
      contentVariablesLength: contentVariables.length,
      contentVariablesPreview: contentVariables.substring(0, 200)
    });

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
