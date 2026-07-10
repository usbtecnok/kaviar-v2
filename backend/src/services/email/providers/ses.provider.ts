import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    size: number;
  }>;
}

export class SESProvider {
  private client: SESClient;
  private fromEmail: string;

  constructor(region: string, fromEmail: string) {
    this.client = new SESClient({ region });
    this.fromEmail = fromEmail;
  }

  async send(params: SendEmailParams): Promise<void> {
    const command = new SendEmailCommand({
      Source: params.from || this.fromEmail,
      Destination: {
        ToAddresses: [params.to],
      },
      ReplyToAddresses: params.replyTo,
      Message: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: params.text,
            Charset: 'UTF-8',
          },
          Html: {
            Data: params.html,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.client.send(command);
  }
}
