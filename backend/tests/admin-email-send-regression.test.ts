import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState, sendMailMock, auditMock } = vi.hoisted(() => ({
  prismaMock: {
    email_send_logs: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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

const { default: adminEmailRoutes } = await import('../src/routes/admin-email');

const app = express();
app.use(express.json());
app.use('/api/admin/email', adminEmailRoutes);

describe('admin email send regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };
    sendMailMock.mockResolvedValue({
      ok: true,
      provider: 'cloudflare',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      messageId: 'smtp-123',
    });
  });

  it('exige autenticacao e super admin', async () => {
    authState.admin = null as any;
    const noAuth = await request(app).post('/api/admin/email/send').send({});
    expect(noAuth.status).toBe(401);

    authState.admin = { id: 'admin-2', email: 'admin2@test.local', role: 'ADMIN' } as any;
    const notSuper = await request(app).post('/api/admin/email/send').send({
      to: 'cidadao@example.com',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      subject: 'Assunto',
      message: 'Mensagem',
    });
    expect(notSuper.status).toBe(403);
  });

  it('aceita payload basico e chama sendMail com html escapado', async () => {
    const res = await request(app)
      .post('/api/admin/email/send')
      .send({
        to: 'Cidadao@Example.com',
        from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
        subject: 'Assunto Oficial',
        message: 'Linha 1\n<script>alert(1)</script>',
      });

    expect(res.status).toBe(200);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'cidadao@example.com',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      subject: 'Assunto Oficial',
      text: 'Linha 1\n<script>alert(1)</script>',
      html: expect.stringContaining('&lt;script&gt;alert(1)&lt;/script&gt;'),
    }));
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'SENT',
        reply_to_inbound_email_id: null,
      }),
    }));
  });

  it('aceita anexos PDF/JPG/PNG e deriva metadata corretamente', async () => {
    const res = await request(app)
      .post('/api/admin/email/send')
      .field('to', 'cidadao@example.com')
      .field('from', 'KAVIAR Suporte <suporte@kaviar.com.br>')
      .field('subject', 'Com anexos')
      .field('message', 'Mensagem com anexos')
      .attach('attachments', Buffer.from('pdf'), { filename: 'documento.pdf', contentType: 'application/pdf' })
      .attach('attachments', Buffer.from('jpg'), { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .attach('attachments', Buffer.from('png'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [
        expect.objectContaining({ filename: 'documento.pdf', contentType: 'application/pdf' }),
        expect.objectContaining({ filename: 'foto.jpg', contentType: 'image/jpeg' }),
        expect.objectContaining({ filename: 'logo.png', contentType: 'image/png' }),
      ],
    }));
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attachment_count: 3,
        attachments_metadata: [
          expect.objectContaining({ filename: 'documento.pdf', contentType: 'application/pdf' }),
          expect.objectContaining({ filename: 'foto.jpg', contentType: 'image/jpeg' }),
          expect.objectContaining({ filename: 'logo.png', contentType: 'image/png' }),
        ],
      }),
    }));
  });

  it('bloqueia extensao invalida', async () => {
    const res = await request(app)
      .post('/api/admin/email/send')
      .field('to', 'cidadao@example.com')
      .field('from', 'KAVIAR Suporte <suporte@kaviar.com.br>')
      .field('subject', 'Arquivo invalido')
      .field('message', 'Mensagem')
      .attach('attachments', Buffer.from('bin'), { filename: 'virus.exe', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('bloqueado');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('bloqueia mais de tres anexos', async () => {
    const req = request(app)
      .post('/api/admin/email/send')
      .field('to', 'cidadao@example.com')
      .field('from', 'KAVIAR Suporte <suporte@kaviar.com.br>')
      .field('subject', 'Muitos anexos')
      .field('message', 'Mensagem');

    req.attach('attachments', Buffer.from('1'), { filename: 'a.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('2'), { filename: 'b.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('3'), { filename: 'c.pdf', contentType: 'application/pdf' });
    req.attach('attachments', Buffer.from('4'), { filename: 'd.pdf', contentType: 'application/pdf' });

    const res = await req;

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('maximo 3 anexos');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('bloqueia arquivo acima de 5 MB', async () => {
    const res = await request(app)
      .post('/api/admin/email/send')
      .field('to', 'cidadao@example.com')
      .field('from', 'KAVIAR Suporte <suporte@kaviar.com.br>')
      .field('subject', 'Grande')
      .field('message', 'Mensagem')
      .attach('attachments', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'grande.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('5 MB');
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('registra ERROR quando provider falha e mantem reply_to_inbound_email_id nulo', async () => {
    sendMailMock.mockResolvedValue({
      ok: false,
      provider: 'cloudflare',
      from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
      error: 'smtp timeout',
      messageId: null,
    });

    const res = await request(app)
      .post('/api/admin/email/send')
      .send({
        to: 'cidadao@example.com',
        from: 'KAVIAR Suporte <suporte@kaviar.com.br>',
        subject: 'Falha',
        message: 'Mensagem',
      });

    expect(res.status).toBe(502);
    expect(prismaMock.email_send_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'ERROR',
        error_message: 'smtp timeout',
        reply_to_inbound_email_id: null,
      }),
    }));
  });
});
