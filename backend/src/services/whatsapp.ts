import twilio from 'twilio';

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SendWhatsAppParams {
  to: string;
  body: string;
}

/**
 * WhatsApp service using Twilio
 * Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */
class WhatsAppService {
  private client: ReturnType<typeof twilio> | null = null;
  private config: WhatsAppConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('[WhatsApp] Missing Twilio env vars - WhatsApp invites disabled');
      return;
    }

    this.config = { accountSid, authToken, fromNumber };
    this.client = twilio(accountSid, authToken);
    console.log('[WhatsApp] Service initialized');
  }

  /**
   * Check if WhatsApp service is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.config !== null;
  }

  /**
   * Normalize phone number to WhatsApp format (whatsapp:+E164)
   */
  private normalizeWhatsAppNumber(phone: string): string {
    // Remove whatsapp: prefix if already present
    const cleaned = phone.replace(/^whatsapp:/, '');
    
    // Ensure + prefix
    const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    
    return `whatsapp:${withPlus}`;
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsAppInvite(params: SendWhatsAppParams): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not configured. Check TWILIO_* env vars.');
    }

    const { to, body } = params;

    try {
      const normalizedTo = this.normalizeWhatsAppNumber(to);
      const normalizedFrom = this.normalizeWhatsAppNumber(this.config!.fromNumber);

      console.log('[WhatsApp] Sending message:', { to: normalizedTo, from: normalizedFrom });

      const message = await this.client!.messages.create({
        body,
        from: normalizedFrom,
        to: normalizedTo
      });

      console.log('[WhatsApp] Message sent:', { sid: message.sid, status: message.status });
    } catch (error: any) {
      console.error('[WhatsApp] Error sending message:', error);
      
      // Twilio-specific error handling
      if (error.code) {
        throw new Error(`Twilio error ${error.code}: ${error.message}`);
      }
      
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
}

export const whatsappService = new WhatsAppService();
