import { SESProvider } from './providers/ses.provider';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string[];
}

interface EmailConfig {
  provider: 'ses' | 'disabled';
  region?: string;
  fromEmail?: string;
  allowedFromEmails: Set<string>;
}

class EmailService {
  private config: EmailConfig;
  private sesProvider?: SESProvider;

  private readonly officialAliases = [
    'contato@kaviar.com.br',
    'suporte@kaviar.com.br',
    'financeiro@kaviar.com.br',
    'no-reply@kaviar.com.br',
  ];

  constructor() {
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'KAVIAR <no-reply@kaviar.com.br>';
    const extraAllowedFrom = (process.env.EMAIL_ALLOWED_FROM || '')
      .split(',')
      .map((value) => this.extractEmailAddress(value))
      .filter(Boolean) as string[];

    this.config = {
      provider: (process.env.EMAIL_PROVIDER as 'ses' | 'disabled') || 'disabled',
      region: process.env.AWS_REGION || 'us-east-2',
      fromEmail,
      allowedFromEmails: new Set([
        ...this.officialAliases,
        ...extraAllowedFrom,
        this.extractEmailAddress(fromEmail),
      ].filter(Boolean) as string[]),
    };

    if (this.config.provider === 'ses') {
      this.sesProvider = new SESProvider(this.config.region!, this.config.fromEmail!);
    }
  }

  private extractEmailAddress(input?: string): string | null {
    if (!input) return null;

    const trimmed = input.trim();
    const match = trimmed.match(/<([^>]+)>/);
    const value = (match ? match[1] : trimmed).trim().toLowerCase();
    if (!value.includes('@')) return null;

    return value;
  }

  private resolveFromEmail(candidate?: string): string {
    if (!candidate) return this.config.fromEmail!;

    const address = this.extractEmailAddress(candidate);
    if (!address || !this.config.allowedFromEmails.has(address)) {
      console.warn('[EMAIL_FROM_FALLBACK] Invalid or non-allowed from address requested. Falling back to default sender.');
      return this.config.fromEmail!;
    }

    return candidate;
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
      await this.sesProvider!.send({
        ...params,
        from: this.resolveFromEmail(params.from),
      });
      console.log(`[EMAIL_SENT] provider=ses to=${maskedEmail} subject="${params.subject}"`);
    } catch (error) {
      console.error(`[EMAIL_SEND_FAILED] provider=ses to=${maskedEmail} error=${(error as Error).message}`);
      // Não propagar erro - fluxo continua
    }
  }
}

export const emailService = new EmailService();
