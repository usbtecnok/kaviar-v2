export function buildKaviarTestEmailTemplate() {
  const subject = 'KAVIAR - Email de teste';

  return {
    subject,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0;">Teste de Email KAVIAR</h2>
        <p>Este email confirma que o envio transacional via Cloudflare SMTP esta ativo.</p>
        <p><strong>Status:</strong> operacional</p>
        <p>Se voce recebeu esta mensagem, a configuracao principal esta funcionando.</p>
      </div>
    `,
    text: [
      'Teste de Email KAVIAR',
      '',
      'Este email confirma que o envio transacional via Cloudflare SMTP esta ativo.',
      'Status: operacional',
      '',
      'Se voce recebeu esta mensagem, a configuracao principal esta funcionando.',
    ].join('\n'),
  };
}

export function buildOperationalNoticeTemplate(input: { title: string; message: string }) {
  const subject = `KAVIAR - ${input.title}`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0;">${escapeHtml(input.title)}</h2>
        <p>${escapeHtml(input.message)}</p>
      </div>
    `,
    text: `${input.title}\n\n${input.message}`,
  };
}

export function buildPasswordResetTemplate(input: { name: string; resetUrl: string }) {
  const subject = 'KAVIAR - Redefinicao de Senha';

  return {
    subject,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0;">Redefinicao de Senha</h2>
        <p>Ola ${escapeHtml(input.name)},</p>
        <p>Voce solicitou a redefinicao de senha. Clique no link abaixo para continuar:</p>
        <p><a href="${escapeHtml(input.resetUrl)}">${escapeHtml(input.resetUrl)}</a></p>
        <p>Este link expira em 15 minutos.</p>
        <p>Se voce nao solicitou esta redefinicao, ignore este email.</p>
      </div>
    `,
    text: [
      `Ola ${input.name},`,
      '',
      'Voce solicitou a redefinicao de senha.',
      `Acesse: ${input.resetUrl}`,
      '',
      'Este link expira em 15 minutos.',
      'Se voce nao solicitou esta redefinicao, ignore este email.',
    ].join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
