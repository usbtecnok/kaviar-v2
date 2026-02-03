import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ 
  region: process.env.AWS_SES_REGION || 'us-east-2' 
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'no-reply@kaviar.com.br';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kaviar.com.br';
const CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET;

export class EmailService {
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `${FRONTEND_URL}/admin/reset-password?token=${token}`;
    
    const params = {
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Redefinição de Senha - KAVIAR Admin',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #FFD700; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 12px 30px; background: #d32f2f; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚕 KAVIAR</h1>
    </div>
    <div class="content">
      <h2>Redefinição de Senha</h2>
      <p>Você solicitou a redefinição de senha para sua conta administrativa no KAVIAR.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Redefinir Senha</a>
      </p>
      <p><strong>Este link expira em 15 minutos.</strong></p>
      <p>Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        Se o botão não funcionar, copie e cole este link no navegador:<br>
        <a href="${resetLink}">${resetLink}</a>
      </p>
    </div>
    <div class="footer">
      <p>© 2026 KAVIAR - Sistema de Corridas Comunitárias</p>
      <p>Este é um email automático. Não responda.</p>
    </div>
  </div>
</body>
</html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
Redefinição de Senha - KAVIAR Admin

Você solicitou a redefinição de senha para sua conta administrativa no KAVIAR.

Acesse o link abaixo para criar uma nova senha:
${resetLink}

Este link expira em 15 minutos.

Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.

---
© 2026 KAVIAR - Sistema de Corridas Comunitárias
Este é um email automático. Não responda.
            `,
            Charset: 'UTF-8',
          },
        },
      },
      ...(CONFIGURATION_SET && { ConfigurationSetName: CONFIGURATION_SET }),
    };

    try {
      await sesClient.send(new SendEmailCommand(params));
    } catch (error) {
      console.error('Error sending email');
      throw new Error('Failed to send email');
    }
  }
}

export const emailService = new EmailService();
