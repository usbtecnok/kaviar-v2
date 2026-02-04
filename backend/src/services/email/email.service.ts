import { SESProvider } from './providers/ses.provider';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface EmailConfig {
  provider: 'ses' | 'disabled';
  region?: string;
  fromEmail?: string;
}

class EmailService {
  private config: EmailConfig;
  private sesProvider?: SESProvider;

  constructor() {
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as 'ses' | 'disabled') || 'disabled',
      region: process.env.AWS_REGION || 'us-east-1',
      fromEmail: process.env.SES_FROM_EMAIL || 'no-reply@kaviar.com.br',
    };

    if (this.config.provider === 'ses') {
      this.sesProvider = new SESProvider(this.config.region!, this.config.fromEmail!);
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const masked = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${masked}@${domain}`;
  }

  async sendMail(params: EmailParams): Promise<void> {
    const maskedEmail = this.maskEmail(params.to);

    if (this.config.provider === 'disabled') {
      console.log(`[EMAIL_DISABLED] to=${maskedEmail} subject="${params.subject}"`);
      return;
    }

    try {
      await this.sesProvider!.send(params);
      console.log(`[EMAIL_SENT] provider=ses to=${maskedEmail} subject="${params.subject}"`);
    } catch (error) {
      console.error(`[EMAIL_SEND_FAILED] provider=ses to=${maskedEmail} error=${(error as Error).message}`);
      // Não propagar erro - fluxo continua
    }
  }
}

export const emailService = new EmailService();
