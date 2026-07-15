import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState, sendMailMock, auditMock } = vi.hoisted(() => ({
  prismaMock: {
    inbound_email_messages: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    email_send_logs: {
      create: vi.fn(),
    },
  },
  authState: {
    admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
  },
  sendMailMock: vi.fn(),
  auditMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/services/email/email.service', () => ({
  emailService: {
    sendMail: sendMailMock,
    getRuntimeInfo: () => ({ provider: 'cloudflare', fromDefault: 'KAVIAR <no-reply@kaviar.com.br>', replyToDefault: ['contato@kaviar.com.br'] }),
  },
}));
vi.mock('../src/utils/audit', () => ({
  audit: auditMock,
  auditCtx: () => ({ adminId: 'admin-1', adminEmail: 'admin@test.local', ip: '127.0.0.1', ua: 'vitest' }),
}));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, res: any, next: any) => {
    if (!authState.admin) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.admin = authState.admin;
    return next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Permissao insuficiente.',
        requiredRoles: ['SUPER_ADMIN'],
        userRole: req.admin?.role,
      });
    }
    return next();
  },
}));

const { default: adminInboundEmailsRoutes } = await import('../src/routes/admin-inbound-emails');

const app = express();
app.use(express.json());
app.use('/api/admin/inbound-emails', adminInboundEmailsRoutes);

function makeInboundEmail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inbound-1',
    received_at: new Date('2026-07-14T12:00:00.000Z'),
    from_email: 'cidadao@example.com',
    from_name: 'Cidadao',
    to_email: 'suporte@kaviar.com.br',
    subject: 'Documentacao pendente',
    text_body: 'Texto',
    html_body: '<p>Texto</p>',
    normalized_body: 'Texto',
    message_id: '<orig@test>',
    in_reply_to: null,
    references_header: '<root@test> <orig@test>',
    provider: 'CLOUDFLARE_EMAIL_WORKER',
    status: 'NEW',
    has_attachments: false,
    attachment_count: 0,
    attachments_metadata: null,
    raw_headers: null,
    created_at: new Date('2026-07-14T12:00:00.000Z'),
    updated_at: new Date('2026-07-14T12:00:00.000Z'),
    ...overrides,
  };
}

describe('admin inbound emails reply route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail());
    sendMailMock.mockResolvedValue({
      ok: true,
      provider: 'cloudflare',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      messageId: 'smtp-123',
    });
  });

  it('retorna preview server-side no detalhe do email', async () => {
    const res = await request(app).get('/api/admin/inbound-emails/inbound-1');

    expect(res.status).toBe(200);
    expect(res.body.data.reply_preview).toEqual({
      allowed: true,
      to: 'cidadao@example.com',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      subject: 'Re: Documentacao pendente',
      in_reply_to: '<orig@test>',
      references: ['<root@test>', '<orig@test>'],
      blocked_reason: null,
    });
    expect(res.body.data.security_risk).toBeDefined();
  });

  it('serializa security_risk na lista de recebidos', async () => {
    prismaMock.inbound_email_messages.findMany.mockResolvedValue([
      makeInboundEmail({
        id: 'inbound-list-1',
        from_email: 'remetente@example.com',
        text_body: 'Segue em anexo meu curriculo.',
        html_body: '<p><a href="https://externo.test/documento">Visualizar</a></p>',
        attachment_count: 0,
        raw_headers: { 'reply-to': 'outro@example.com' },
      }),
    ]);
    prismaMock.inbound_email_messages.count.mockResolvedValue(1);

    const res = await request(app).get('/api/admin/inbound-emails');

    expect(res.status).toBe(200);
    expect(res.body.data[0].security_risk).toEqual(expect.objectContaining({
      level: 'HIGH',
      suspicious: true,
      reasons: expect.arrayContaining([
        'MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT',
        'EXTERNAL_LINK_PRESENT',
        'REPLY_TO_DIFFERS_FROM_FROM',
      ]),
    }));
  });

  it('serializa security_risk no detalhe do email', async () => {
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail({
      text_body: 'Segue em anexo meu curriculo.',
      html_body: '<p><a href="https://externo.test/documento">Visualizar</a></p>',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'outro@example.com' },
    }));

    const res = await request(app).get('/api/admin/inbound-emails/inbound-1');

    expect(res.status).toBe(200);
    expect(res.body.data.security_risk).toEqual(expect.objectContaining({
      level: 'HIGH',
      suspicious: true,
      reasons: expect.arrayContaining([
        'MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT',
        'EXTERNAL_LINK_PRESENT',
        'REPLY_TO_DIFFERS_FROM_FROM',
      ]),
    }));
  });

  it('deriva destinatario, remetente, assunto e threading no servidor e ignora payload malicioso do frontend', async () => {
    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', '  Segue retorno oficial.  ')
      .field('to', 'ataque@example.com')
      .field('from', 'KAVIAR <contato@kaviar.com.br>')
      .field('subject', 'Hack')
      .field('inReplyTo', '<evil@test>')
      .field('references', '<evil-1@test>');

    expect(res.status).toBe(200);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'cidadao@example.com',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      subject: 'Re: Documentacao pendente',
      text: 'Segue retorno oficial.',
      inReplyTo: '<orig@test>',
      references: ['<root@test>', '<orig@test>'],
    }));
    expect(sendMailMock.mock.calls[0][0]).not.toEqual(expect.objectContaining({
      to: 'ataque@example.com',
      subject: 'Hack',
      inReplyTo: '<evil@test>',
    }));
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reply_to_inbound_email_id: 'inbound-1',
        to_email: 'cidadao@example.com',
        from_email: 'suporte@kaviar.com.br',
        status: 'SENT',
        provider_message_id: 'smtp-123',
      }),
    }));
  });

  it('nao duplica prefixo Re no assunto', async () => {
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail({ subject: 'RE: Ja em thread' }));

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Resposta sem duplicar assunto');

    expect(res.status).toBe(200);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'RE: Ja em thread',
    }));
  });

  it('bloqueia reply quando o message id original esta ausente', async () => {
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail({ message_id: null }));

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Tentativa');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Message-ID');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('bloqueia reply para alias no-reply', async () => {
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail({ to_email: 'no-reply@kaviar.com.br' }));

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Tentativa');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no-reply');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('bloqueia reply para alias nao autorizado', async () => {
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue(makeInboundEmail({ to_email: 'juridico@kaviar.com.br' }));

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Tentativa');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('nao autorizado');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('registra erro com vinculo ao inbound quando o provider falha', async () => {
    sendMailMock.mockResolvedValue({
      ok: false,
      provider: 'cloudflare',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      error: 'smtp timeout',
    });

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Falha controlada');

    expect(res.status).toBe(502);
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reply_to_inbound_email_id: 'inbound-1',
        status: 'ERROR',
        error_message: 'smtp timeout',
      }),
    }));
  });

  it('aceita anexos validos e envia metadados saneados ao provider', async () => {
    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Segue anexo')
      .attach('attachments', Buffer.from('pdf'), { filename: 'Alvara Oficial.pdf', contentType: 'application/pdf' })
      .attach('attachments', Buffer.from('png'), { filename: 'foto.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [
        expect.objectContaining({ filename: 'Alvara_Oficial.pdf', contentType: 'application/pdf' }),
        expect.objectContaining({ filename: 'foto.png', contentType: 'image/png' }),
      ],
    }));
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attachment_count: 2,
      }),
    }));
  });

  it('rejeita mais de tres anexos', async () => {
    const req = request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Arquivos demais');

    req.attach('attachments', Buffer.from('1'), { filename: 'a.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('2'), { filename: 'b.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('3'), { filename: 'c.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('4'), { filename: 'd.pdf', contentType: 'application/pdf' });

    const res = await req;

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('maximo 3 anexos');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('rejeita anexo acima de 5 MB', async () => {
    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Arquivo grande')
      .attach('attachments', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'grande.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('5 MB');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('rejeita mime type invalido', async () => {
    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Arquivo invalido')
      .attach('attachments', Buffer.from('txt'), { filename: 'texto.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Tipo de arquivo nao permitido');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('rejeita extensao incoerente com o mime type', async () => {
    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Arquivo inconsistente')
      .attach('attachments', Buffer.from('pdf fake'), { filename: 'texto.txt', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Extensao nao permitida');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('exige perfil super admin para responder', async () => {
    authState.admin = { id: 'admin-2', email: 'admin2@test.local', role: 'ADMIN' };

    const res = await request(app)
      .post('/api/admin/inbound-emails/inbound-1/reply')
      .field('message', 'Sem permissao');

    expect(res.status).toBe(403);
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
