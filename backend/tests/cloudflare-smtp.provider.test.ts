import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransportMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  sendMailMock: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: createTransportMock,
  },
}));

const { CloudflareSMTPProvider } = await import('../src/services/email/providers/cloudflare-smtp.provider');

describe('CloudflareSMTPProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });
    sendMailMock.mockResolvedValue({ messageId: '<smtp@test>' });
  });

  it('propaga inReplyTo e references para o nodemailer', async () => {
    const provider = new CloudflareSMTPProvider({
      host: 'smtp.mx.cloudflare.net',
      port: 465,
      secure: true,
      user: 'api_token',
      token: 'secret-token',
    });

    const result = await provider.send({
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      to: 'cidadao@example.com',
      subject: 'Re: Documento',
      text: 'Texto',
      html: '<p>Texto</p>',
      inReplyTo: '<orig@test>',
      references: ['<root@test>', '<orig@test>'],
      attachments: [
        {
          filename: 'doc.pdf',
          content: Buffer.from('pdf'),
          contentType: 'application/pdf',
          size: 3,
        },
      ],
    });

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      inReplyTo: '<orig@test>',
      references: ['<root@test>', '<orig@test>'],
      replyTo: undefined,
      attachments: [
        expect.objectContaining({
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        }),
      ],
    }));
    expect(result).toEqual({ messageId: '<smtp@test>' });
  });
});
